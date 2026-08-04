import { db } from '../db';

export interface Occurrence {
  busId: number;
  start: string;
  end: string;
}

export interface ConflictRow {
  id: number;
  title: string;
  start_utc: string;
  end_utc: string;
  display_name: string;
  quantity: number;
}

export interface AvailabilityResult {
  available: number;
  overlapping: ConflictRow[];
}

/**
 * Findet Buchungen desselben Busses, die sich mit dem Zeitraum überschneiden.
 * Intervalle sind halboffen: Ende 12:00 und Start 12:00 kollidieren nicht.
 */
export function findConflicts(
  occ: Occurrence,
  exclude: { bookingId?: number; seriesId?: string } = {}
): ConflictRow[] {
  return db
    .prepare(
      `SELECT b.id, b.title, b.start_utc, b.end_utc, u.display_name, b.quantity
       FROM bookings b
       JOIN users u ON u.id = b.user_id
       WHERE b.bus_id = @busId
         AND b.start_utc < @end
         AND b.end_utc > @start
         AND (@bookingId IS NULL OR b.id != @bookingId)
         AND (@seriesId IS NULL OR b.series_id IS NULL OR b.series_id != @seriesId)
       ORDER BY b.start_utc`
    )
    .all({
      busId: occ.busId,
      start: occ.start,
      end: occ.end,
      bookingId: exclude.bookingId ?? null,
      seriesId: exclude.seriesId ?? null,
    }) as ConflictRow[];
}

/**
 * Prüft, wie viel von einer Ressource im Zeitraum noch frei ist: totalQuantity
 * abzüglich der Summe bereits überlappend gebuchter Mengen. Für Ressourcen mit
 * totalQuantity 1 (z.B. Fahrzeuge) entspricht das dem bisherigen Alles-oder-
 * nichts-Verhalten.
 */
export function checkAvailability(
  occ: Occurrence,
  totalQuantity: number,
  exclude: { bookingId?: number; seriesId?: string } = {}
): AvailabilityResult {
  const overlapping = findConflicts(occ, exclude);
  const booked = overlapping.reduce((sum, row) => sum + row.quantity, 0);
  return { available: totalQuantity - booked, overlapping };
}
