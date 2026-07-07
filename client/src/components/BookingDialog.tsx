import { useState } from 'react';
import { api, ApiError } from '../api/client';
import type { Booking, Bus, Conflict } from '../api/types';
import { formatRange, toLocalInput } from '../format';
import { Modal } from './Modal';

export type DialogState =
  | { mode: 'create'; start?: Date; end?: Date }
  | { mode: 'edit'; booking: Booking };

interface Props {
  buses: Bus[];
  state: DialogState;
  onClose: () => void;
  onSaved: () => void;
}

function defaultStart(): Date {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  return d;
}

export function BookingDialog({ buses, state, onClose, onSaved }: Props) {
  const editing = state.mode === 'edit' ? state.booking : null;

  const [busId, setBusId] = useState<number>(editing?.busId ?? buses[0]?.id ?? 0);
  const [title, setTitle] = useState(editing?.title ?? '');
  const [startLocal, setStartLocal] = useState(() =>
    toLocalInput(
      editing ? new Date(editing.start) : state.mode === 'create' && state.start ? state.start : defaultStart()
    )
  );
  const [endLocal, setEndLocal] = useState(() => {
    if (editing) return toLocalInput(new Date(editing.end));
    if (state.mode === 'create' && state.end) return toLocalInput(state.end);
    const d = state.mode === 'create' && state.start ? new Date(state.start) : defaultStart();
    d.setHours(d.getHours() + 2);
    return toLocalInput(d);
  });
  const [notes, setNotes] = useState(editing?.notes ?? '');
  const [recurring, setRecurring] = useState(false);
  const [interval, setInterval] = useState(1);
  const [until, setUntil] = useState('');
  const [scope, setScope] = useState<'single' | 'series'>('single');
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setConflicts([]);
    setBusy(true);
    try {
      const payload = {
        busId,
        title,
        start: new Date(startLocal).toISOString(),
        end: new Date(endLocal).toISOString(),
        notes: notes.trim() || null,
      };
      if (editing) {
        await api.put(`/bookings/${editing.id}?scope=${scope}`, payload);
      } else {
        await api.post('/bookings', {
          ...payload,
          recurrence: recurring ? { freq: 'weekly' as const, interval, until } : null,
        });
      }
      onSaved();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        const data = err.data as { conflicts?: Conflict[] };
        setConflicts(data.conflicts ?? []);
        setError(err.message);
      } else {
        setError(err instanceof ApiError ? err.message : 'Speichern fehlgeschlagen');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={editing ? 'Buchung bearbeiten' : 'Neue Buchung'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <label className="block">
          <span className="label">Bus</span>
          <select
            value={busId}
            onChange={(e) => setBusId(Number(e.target.value))}
            required
            className="input"
          >
            {buses.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.licensePlate}, {b.seats} Plätze)
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="label">Zweck</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={200}
            placeholder="z.B. Jugendturnier in Mainz"
            className="input"
          />
        </label>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="label">Beginn</span>
            <input
              type="datetime-local"
              value={startLocal}
              onChange={(e) => setStartLocal(e.target.value)}
              required
              className="input"
            />
          </label>
          <label className="block">
            <span className="label">Ende</span>
            <input
              type="datetime-local"
              value={endLocal}
              onChange={(e) => setEndLocal(e.target.value)}
              required
              className="input"
            />
          </label>
        </div>

        <label className="block">
          <span className="label">Notizen (optional)</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            maxLength={2000}
            className="input"
          />
        </label>

        {!editing && (
          <div className="space-y-3 rounded-lg bg-gray-50 p-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={recurring}
                onChange={(e) => setRecurring(e.target.checked)}
                className="h-4 w-4"
              />
              <span className="text-sm font-medium">Wöchentlich wiederholen</span>
            </label>
            {recurring && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="label">Wiederholung</span>
                  <select
                    value={interval}
                    onChange={(e) => setInterval(Number(e.target.value))}
                    className="input"
                  >
                    <option value={1}>Jede Woche</option>
                    <option value={2}>Alle 2 Wochen</option>
                    <option value={4}>Alle 4 Wochen</option>
                  </select>
                </label>
                <label className="block">
                  <span className="label">Wiederholen bis</span>
                  <input
                    type="date"
                    value={until}
                    onChange={(e) => setUntil(e.target.value)}
                    required
                    className="input"
                  />
                </label>
              </div>
            )}
          </div>
        )}

        {editing?.seriesId && (
          <fieldset className="space-y-2 rounded-lg bg-gray-50 p-3">
            <legend className="px-1 text-sm font-medium">
              Diese Buchung gehört zu einer Serie ↻
            </legend>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="scope"
                checked={scope === 'single'}
                onChange={() => setScope('single')}
              />
              Nur diesen Termin ändern
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="scope"
                checked={scope === 'series'}
                onChange={() => setScope('series')}
              />
              Diesen und alle folgenden Termine ändern
            </label>
          </fieldset>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <p className="font-medium">{error}</p>
            {conflicts.length > 0 && (
              <ul className="mt-2 space-y-1">
                {conflicts.map((c) => (
                  <li key={`${c.id}-${c.start}`}>
                    {formatRange(c.start, c.end)} — „{c.title}“ ({c.userDisplayName})
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <button type="submit" disabled={busy || buses.length === 0} className="btn-primary flex-1">
            {busy ? 'Speichern …' : editing ? 'Speichern' : 'Buchen'}
          </button>
          <button type="button" onClick={onClose} className="btn-secondary">
            Abbrechen
          </button>
        </div>
      </form>
    </Modal>
  );
}
