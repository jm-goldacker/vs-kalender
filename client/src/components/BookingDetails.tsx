import { useState } from 'react';
import { api, ApiError } from '../api/client';
import type { Booking } from '../api/types';
import { useAuth } from '../auth';
import { formatRange } from '../format';
import { Modal } from './Modal';

interface Props {
  booking: Booking;
  onClose: () => void;
  onEdit: () => void;
  onChanged: () => void;
}

export function BookingDetails({ booking, onClose, onEdit, onChanged }: Props) {
  const { user } = useAuth();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const canEdit = user?.role === 'admin' || user?.id === booking.userId;

  const remove = async (scope: 'single' | 'series') => {
    setBusy(true);
    setError('');
    try {
      await api.delete(`/bookings/${booking.id}?scope=${scope}`);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Löschen fehlgeschlagen');
      setBusy(false);
    }
  };

  return (
    <Modal title={booking.title} onClose={onClose}>
      <div className="space-y-4">
        <div className="space-y-2 text-sm">
          <p className="flex items-center gap-2">
            <span
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: booking.busColor }}
              aria-hidden
            />
            <span className="font-medium">{booking.busName}</span>
          </p>
          <p>{formatRange(booking.start, booking.end)}</p>
          {booking.quantity > 1 && (
            <p className="text-gray-600">
              Menge: {booking.quantity} von {booking.busQuantity ?? booking.quantity}
            </p>
          )}
          <p className="text-gray-600">Gebucht von {booking.userDisplayName}</p>
          {booking.seriesId && <p className="text-gray-600">↻ Teil einer wöchentlichen Serie</p>}
          {booking.notes && <p className="whitespace-pre-wrap text-gray-700">{booking.notes}</p>}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {canEdit && !confirmDelete && (
          <div className="flex gap-2">
            <button onClick={onEdit} className="btn-primary flex-1">
              Bearbeiten
            </button>
            <button onClick={() => setConfirmDelete(true)} className="btn-danger">
              Löschen
            </button>
          </div>
        )}

        {canEdit && confirmDelete && (
          <div className="space-y-2 rounded-lg bg-red-50 p-3">
            <p className="text-sm font-medium text-red-800">Buchung wirklich löschen?</p>
            <div className="flex flex-col gap-2">
              <button onClick={() => remove('single')} disabled={busy} className="btn-danger">
                {booking.seriesId ? 'Nur diesen Termin löschen' : 'Ja, löschen'}
              </button>
              {booking.seriesId && (
                <button onClick={() => remove('series')} disabled={busy} className="btn-danger">
                  Diesen und alle folgenden Termine löschen
                </button>
              )}
              <button onClick={() => setConfirmDelete(false)} className="btn-secondary">
                Abbrechen
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
