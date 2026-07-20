import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../api/client';
import type { Bus, User } from '../api/types';
import { useAuth } from '../auth';
import { Modal } from '../components/Modal';

/* ---------- Nutzerverwaltung ---------- */

function UserForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/users', {
        username,
        displayName,
        password,
        role: isAdmin ? 'admin' : 'member',
      });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Anlegen fehlgeschlagen');
    }
  };

  return (
    <Modal title="Neuen Benutzer anlegen" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <label className="block">
          <span className="label">Anzeigename</span>
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required className="input" />
        </label>
        <label className="block">
          <span className="label">Benutzername (für die Anmeldung)</span>
          <input value={username} onChange={(e) => setUsername(e.target.value)} required minLength={2} className="input" />
        </label>
        <label className="block">
          <span className="label">Initialpasswort (mind. 8 Zeichen)</span>
          <input value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} className="input" />
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={isAdmin} onChange={(e) => setIsAdmin(e.target.checked)} className="h-4 w-4" />
          <span className="text-sm">Administrator</span>
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button type="submit" className="btn-primary flex-1">Anlegen</button>
          <button type="button" onClick={onClose} className="btn-secondary">Abbrechen</button>
        </div>
      </form>
    </Modal>
  );
}

function ResetPasswordDialog({ user, onClose }: { user: User; onClose: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api.put(`/users/${user.id}/password`, { password });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Zurücksetzen fehlgeschlagen');
    }
  };

  return (
    <Modal title={`Passwort zurücksetzen: ${user.displayName}`} onClose={onClose}>
      {done ? (
        <div className="space-y-4">
          <p className="text-green-700">Das Passwort wurde zurückgesetzt.</p>
          <button onClick={onClose} className="btn-primary">Schließen</button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="label">Neues Passwort (mind. 8 Zeichen)</span>
            <input value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} className="input" />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" className="btn-primary">Zurücksetzen</button>
        </form>
      )}
    </Modal>
  );
}

function UsersTab() {
  const queryClient = useQueryClient();
  const { user: me } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [resetUser, setResetUser] = useState<User | null>(null);
  const [error, setError] = useState('');

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get<User[]>('/users'),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['users'] });

  const update = async (id: number, body: Partial<Pick<User, 'role' | 'isActive'>>) => {
    setError('');
    try {
      await api.put(`/users/${id}`, body);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Änderung fehlgeschlagen');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Benutzer ({users.length})</h2>
        <button onClick={() => setShowForm(true)} className="btn-primary">+ Benutzer</button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <ul className="space-y-2">
        {users.map((u) => (
          <li
            key={u.id}
            className={`flex flex-wrap items-center gap-2 rounded-xl bg-white p-3 shadow-sm ${u.isActive ? '' : 'opacity-60'}`}
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">
                {u.displayName}
                {u.role === 'admin' && (
                  <span className="ml-2 rounded bg-brand/15 px-1.5 py-0.5 text-xs font-semibold text-brand-dark">Admin</span>
                )}
                {!u.isActive && (
                  <span className="ml-2 rounded bg-gray-200 px-1.5 py-0.5 text-xs">deaktiviert</span>
                )}
              </p>
              <p className="truncate text-sm text-gray-500">@{u.username}</p>
            </div>
            <div className="flex flex-wrap gap-1.5 text-sm">
              <button onClick={() => setResetUser(u)} className="btn-secondary !px-2.5 !py-1.5">
                Passwort
              </button>
              {u.id !== me?.id && (
                <>
                  <button
                    onClick={() => update(u.id, { role: u.role === 'admin' ? 'member' : 'admin' })}
                    className="btn-secondary !px-2.5 !py-1.5"
                  >
                    {u.role === 'admin' ? 'Zu Mitglied' : 'Zu Admin'}
                  </button>
                  <button
                    onClick={() => update(u.id, { isActive: !u.isActive })}
                    className="btn-secondary !px-2.5 !py-1.5"
                  >
                    {u.isActive ? 'Deaktivieren' : 'Aktivieren'}
                  </button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
      {showForm && (
        <UserForm
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            void refresh();
          }}
        />
      )}
      {resetUser && <ResetPasswordDialog user={resetUser} onClose={() => setResetUser(null)} />}
    </div>
  );
}

/* ---------- Busverwaltung ---------- */

function BusForm({ bus, onClose, onSaved }: { bus: Bus | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(bus?.name ?? '');
  const [category, setCategory] = useState<Bus['category']>(bus?.category ?? 'fahrzeug');
  const [licensePlate, setLicensePlate] = useState(bus?.licensePlate ?? '');
  const [seats, setSeats] = useState(bus?.seats ?? 9);
  const [color, setColor] = useState(bus?.color ?? '#2563eb');
  const [error, setError] = useState('');

  const fahrzeug = category === 'fahrzeug';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const body = {
      name,
      category,
      licensePlate: fahrzeug ? licensePlate : null,
      seats: fahrzeug ? seats : null,
      color,
    };
    try {
      if (bus) await api.put(`/buses/${bus.id}`, body);
      else await api.post('/buses', body);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Speichern fehlgeschlagen');
    }
  };

  return (
    <Modal title={bus ? `Ressource bearbeiten: ${bus.name}` : 'Neue Ressource anlegen'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="label">Kategorie</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Bus['category'])}
              className="input"
            >
              <option value="fahrzeug">Fahrzeug</option>
              <option value="geraet">Gerät</option>
            </select>
          </label>
          <label className="block">
            <span className="label">Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder={fahrzeug ? 'z.B. Sprinter groß' : 'z.B. Popcornmaschine'}
              className="input"
            />
          </label>
        </div>
        {fahrzeug && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="label">Kennzeichen</span>
              <input value={licensePlate ?? ''} onChange={(e) => setLicensePlate(e.target.value)} required className="input" />
            </label>
            <label className="block">
              <span className="label">Sitzplätze</span>
              <input
                type="number"
                min={1}
                max={200}
                value={seats ?? 9}
                onChange={(e) => setSeats(Number(e.target.value))}
                required
                className="input"
              />
            </label>
          </div>
        )}
        <label className="block">
          <span className="label">Farbe im Kalender</span>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-11 w-24 cursor-pointer rounded-lg border border-gray-300"
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button type="submit" className="btn-primary flex-1">Speichern</button>
          <button type="button" onClick={onClose} className="btn-secondary">Abbrechen</button>
        </div>
      </form>
    </Modal>
  );
}

function BusesTab() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<{ open: boolean; bus: Bus | null }>({ open: false, bus: null });
  const [error, setError] = useState('');

  const { data: buses = [] } = useQuery({
    queryKey: ['buses', 'all'],
    queryFn: () => api.get<Bus[]>('/buses?all=1'),
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['buses'] });
  };

  const toggleActive = async (bus: Bus) => {
    setError('');
    try {
      if (bus.isActive) await api.delete(`/buses/${bus.id}`);
      else await api.put(`/buses/${bus.id}`, { ...bus, isActive: true });
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Änderung fehlgeschlagen');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Ressourcen ({buses.length})</h2>
        <button onClick={() => setForm({ open: true, bus: null })} className="btn-primary">+ Ressource</button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <ul className="space-y-2">
        {buses.map((bus) => (
          <li
            key={bus.id}
            className={`flex flex-wrap items-center gap-2 rounded-xl bg-white p-3 shadow-sm ${bus.isActive ? '' : 'opacity-60'}`}
          >
            <span className="h-4 w-4 shrink-0 rounded-full" style={{ backgroundColor: bus.color }} aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">
                {bus.name}
                {!bus.isActive && (
                  <span className="ml-2 rounded bg-gray-200 px-1.5 py-0.5 text-xs">deaktiviert</span>
                )}
              </p>
              <p className="truncate text-sm text-gray-500">
                {bus.category === 'fahrzeug' ? `${bus.licensePlate} · ${bus.seats} Plätze` : 'Gerät'}
              </p>
            </div>
            <div className="flex gap-1.5">
              <button onClick={() => setForm({ open: true, bus })} className="btn-secondary !px-2.5 !py-1.5">
                Bearbeiten
              </button>
              <button onClick={() => toggleActive(bus)} className="btn-secondary !px-2.5 !py-1.5">
                {bus.isActive ? 'Deaktivieren' : 'Aktivieren'}
              </button>
            </div>
          </li>
        ))}
        {buses.length === 0 && (
          <li className="rounded-xl bg-white p-6 text-center text-sm text-gray-500 shadow-sm">
            Noch keine Ressourcen angelegt. Lege die erste Ressource an, damit gebucht werden kann.
          </li>
        )}
      </ul>
      {form.open && (
        <BusForm
          bus={form.bus}
          onClose={() => setForm({ open: false, bus: null })}
          onSaved={() => {
            setForm({ open: false, bus: null });
            refresh();
          }}
        />
      )}
    </div>
  );
}

/* ---------- Seite ---------- */

export function AdminPage() {
  const [tab, setTab] = useState<'buses' | 'users'>('buses');

  const tabClass = (active: boolean) =>
    `rounded-lg px-4 py-2 text-sm font-semibold ${active ? 'bg-brand text-white' : 'bg-white text-ink shadow-sm'}`;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button onClick={() => setTab('buses')} className={tabClass(tab === 'buses')}>
          Ressourcen
        </button>
        <button onClick={() => setTab('users')} className={tabClass(tab === 'users')}>
          Benutzer
        </button>
      </div>
      {tab === 'buses' ? <BusesTab /> : <UsersTab />}
    </div>
  );
}
