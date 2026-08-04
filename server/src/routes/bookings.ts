import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { ConflictError, HttpError } from '../errors';
import { checkAvailability, type ConflictRow } from '../services/conflicts';
import { expandWeekly } from '../services/recurrence';
import { normalizeUtc, nowUtc } from '../time';
import type { BookingDto } from '../types';

interface BookingRow {
  id: number;
  bus_id: number;
  user_id: number;
  title: string;
  start_utc: string;
  end_utc: string;
  series_id: string | null;
  notes: string | null;
  quantity: number;
}

interface BusRow {
  id: number;
  category: 'fahrzeug' | 'geraet';
  quantity: number | null;
}

interface SeriesRow {
  id: string;
  freq: 'weekly';
  interval: number;
  until: string;
}

const isoDate = z.string().refine((v) => !Number.isNaN(Date.parse(v)), 'Ungültiges Datum');

const bookingSchema = z.object({
  busId: z.number().int().positive(),
  title: z.string().trim().min(1, 'Bitte einen Zweck angeben').max(200),
  start: isoDate,
  end: isoDate,
  quantity: z.number().int().min(1).max(100000).default(1),
  notes: z.string().trim().max(2000).nullish(),
});

const createSchema = bookingSchema.extend({
  recurrence: z
    .object({
      freq: z.literal('weekly'),
      interval: z.number().int().min(1).max(8),
      until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ungültiges Enddatum der Serie'),
    })
    .nullish(),
});

type BookingRowWithJoins = BookingRow & {
  display_name: string;
  bus_name: string;
  bus_color: string;
  bus_quantity: number | null;
};

function toDto(row: BookingRowWithJoins): BookingDto {
  return {
    id: row.id,
    busId: row.bus_id,
    userId: row.user_id,
    title: row.title,
    start: row.start_utc,
    end: row.end_utc,
    seriesId: row.series_id,
    notes: row.notes,
    quantity: row.quantity,
    userDisplayName: row.display_name,
    busName: row.bus_name,
    busColor: row.bus_color,
    busQuantity: row.bus_quantity,
  };
}

function validateTimes(start: string, end: string): void {
  if (end <= start) throw new HttpError(400, 'Das Ende muss nach dem Beginn liegen');
  const oneYearAgo = new Date();
  oneYearAgo.setUTCFullYear(oneYearAgo.getUTCFullYear() - 1);
  if (start < oneYearAgo.toISOString()) {
    throw new HttpError(400, 'Der Beginn liegt zu weit in der Vergangenheit');
  }
}

function loadActiveBus(busId: number): BusRow {
  const bus = db
    .prepare('SELECT id, category, quantity FROM buses WHERE id = ? AND is_active = 1')
    .get(busId) as BusRow | undefined;
  if (!bus) throw new HttpError(400, 'Die gewählte Ressource existiert nicht oder ist deaktiviert');
  return bus;
}

function validateQuantity(bus: BusRow, requested: number): void {
  const total = bus.quantity ?? 1;
  if (requested > total) {
    throw new HttpError(400, `Die angefragte Menge übersteigt die Gesamtanzahl der Ressource (${total})`);
  }
}

function loadBooking(id: number): BookingRow {
  const row = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id) as BookingRow | undefined;
  if (!row) throw new HttpError(404, 'Buchung nicht gefunden');
  return row;
}

function requireOwnership(row: BookingRow, req: { session: { userId?: number; role?: string } }): void {
  if (row.user_id !== req.session.userId && req.session.role !== 'admin') {
    throw new HttpError(403, 'Du kannst nur deine eigenen Buchungen bearbeiten');
  }
}

/** Löscht die Serien-Metadaten, wenn keine Buchung mehr darauf verweist. */
function cleanupSeries(seriesId: string): void {
  const { c } = db
    .prepare('SELECT COUNT(*) AS c FROM bookings WHERE series_id = ?')
    .get(seriesId) as { c: number };
  if (c === 0) db.prepare('DELETE FROM booking_series WHERE id = ?').run(seriesId);
}

const insertBooking = () =>
  db.prepare(
    `INSERT INTO bookings (bus_id, user_id, title, start_utc, end_utc, quantity, series_id, notes)
     VALUES (@busId, @userId, @title, @start, @end, @quantity, @seriesId, @notes)`
  );

export const bookingsRouter = Router();

bookingsRouter.get('/', (req, res) => {
  const from = normalizeUtc(String(req.query.from ?? ''));
  const to = normalizeUtc(String(req.query.to ?? ''));
  const rows = db
    .prepare(
      `SELECT b.*, u.display_name, bus.name AS bus_name, bus.color AS bus_color, bus.quantity AS bus_quantity
       FROM bookings b
       JOIN users u ON u.id = b.user_id
       JOIN buses bus ON bus.id = b.bus_id
       WHERE b.start_utc < @to AND b.end_utc > @from
       ORDER BY b.start_utc`
    )
    .all({ from, to }) as BookingRowWithJoins[];
  res.json(rows.map(toDto));
});

bookingsRouter.post('/', (req, res) => {
  const body = createSchema.parse(req.body);
  const start = normalizeUtc(body.start);
  const end = normalizeUtc(body.end);
  validateTimes(start, end);
  const bus = loadActiveBus(body.busId);
  validateQuantity(bus, body.quantity);
  const totalQuantity = bus.quantity ?? 1;

  const occurrences = body.recurrence
    ? expandWeekly(start, end, body.recurrence.interval, body.recurrence.until)
    : [{ start, end }];

  const result = db.transaction(() => {
    const conflicts: ConflictRow[] = [];
    let minAvailable: number | undefined;
    for (const occ of occurrences) {
      const { available, overlapping } = checkAvailability({ busId: body.busId, ...occ }, totalQuantity);
      if (available < body.quantity) {
        conflicts.push(...overlapping);
        minAvailable = minAvailable === undefined ? available : Math.min(minAvailable, available);
        if (conflicts.length >= 5) break;
      }
    }
    if (conflicts.length > 0) throw new ConflictError(conflicts.slice(0, 5), minAvailable, body.quantity);

    let seriesId: string | null = null;
    if (body.recurrence) {
      seriesId = randomUUID();
      db.prepare('INSERT INTO booking_series (id, freq, interval, until) VALUES (?, ?, ?, ?)').run(
        seriesId,
        body.recurrence.freq,
        body.recurrence.interval,
        body.recurrence.until
      );
    }

    const insert = insertBooking();
    let firstId = 0;
    for (const occ of occurrences) {
      const info = insert.run({
        busId: body.busId,
        userId: req.session.userId,
        title: body.title,
        start: occ.start,
        end: occ.end,
        quantity: body.quantity,
        seriesId,
        notes: body.notes ?? null,
      });
      if (firstId === 0) firstId = Number(info.lastInsertRowid);
    }
    return { id: firstId, count: occurrences.length, seriesId };
  })();

  res.status(201).json(result);
});

bookingsRouter.put('/:id', (req, res) => {
  const booking = loadBooking(Number(req.params.id));
  requireOwnership(booking, req);

  const body = bookingSchema.parse(req.body);
  const start = normalizeUtc(body.start);
  const end = normalizeUtc(body.end);
  validateTimes(start, end);
  const bus = loadActiveBus(body.busId);
  validateQuantity(bus, body.quantity);
  const totalQuantity = bus.quantity ?? 1;

  const scope = req.query.scope === 'series' ? 'series' : 'single';

  if (scope === 'single') {
    db.transaction(() => {
      const { available, overlapping } = checkAvailability(
        { busId: body.busId, start, end },
        totalQuantity,
        { bookingId: booking.id }
      );
      if (available < body.quantity) {
        throw new ConflictError(overlapping.slice(0, 5), available, body.quantity);
      }
      db.prepare(
        `UPDATE bookings SET bus_id = ?, title = ?, start_utc = ?, end_utc = ?, quantity = ?, notes = ?, updated_at = ?
         WHERE id = ?`
      ).run(body.busId, body.title, start, end, body.quantity, body.notes ?? null, nowUtc(), booking.id);
    })();
    return res.json({ ok: true, count: 1 });
  }

  if (!booking.series_id) {
    throw new HttpError(400, 'Diese Buchung gehört zu keiner Serie');
  }
  const series = db
    .prepare('SELECT * FROM booking_series WHERE id = ?')
    .get(booking.series_id) as SeriesRow;

  const timeChanged = start !== booking.start_utc || end !== booking.end_utc;

  const count = db.transaction(() => {
    if (timeChanged) {
      // Zeitänderung: diesen und alle folgenden Termine löschen und ab den
      // neuen Zeiten bis zum Serienende neu generieren
      db.prepare('DELETE FROM bookings WHERE series_id = ? AND start_utc >= ?').run(
        series.id,
        booking.start_utc
      );
      const occurrences = expandWeekly(start, end, series.interval, series.until);
      const conflicts: ConflictRow[] = [];
      let minAvailable: number | undefined;
      for (const occ of occurrences) {
        const { available, overlapping } = checkAvailability(
          { busId: body.busId, ...occ },
          totalQuantity,
          { seriesId: series.id }
        );
        if (available < body.quantity) {
          conflicts.push(...overlapping);
          minAvailable = minAvailable === undefined ? available : Math.min(minAvailable, available);
          if (conflicts.length >= 5) break;
        }
      }
      if (conflicts.length > 0) throw new ConflictError(conflicts.slice(0, 5), minAvailable, body.quantity);

      const insert = insertBooking();
      for (const occ of occurrences) {
        insert.run({
          busId: body.busId,
          userId: booking.user_id,
          title: body.title,
          start: occ.start,
          end: occ.end,
          quantity: body.quantity,
          seriesId: series.id,
          notes: body.notes ?? null,
        });
      }
      return occurrences.length;
    }

    // Nur Bus/Titel/Menge/Notizen: bei Bus- oder Mengenwechsel Verfügbarkeit für alle betroffenen Termine prüfen
    const affected = db
      .prepare('SELECT * FROM bookings WHERE series_id = ? AND start_utc >= ?')
      .all(series.id, booking.start_utc) as BookingRow[];
    if (body.busId !== booking.bus_id || body.quantity !== booking.quantity) {
      const conflicts: ConflictRow[] = [];
      let minAvailable: number | undefined;
      for (const occ of affected) {
        const { available, overlapping } = checkAvailability(
          { busId: body.busId, start: occ.start_utc, end: occ.end_utc },
          totalQuantity,
          { seriesId: series.id }
        );
        if (available < body.quantity) {
          conflicts.push(...overlapping);
          minAvailable = minAvailable === undefined ? available : Math.min(minAvailable, available);
          if (conflicts.length >= 5) break;
        }
      }
      if (conflicts.length > 0) throw new ConflictError(conflicts.slice(0, 5), minAvailable, body.quantity);
    }
    db.prepare(
      `UPDATE bookings SET bus_id = ?, title = ?, quantity = ?, notes = ?, updated_at = ?
       WHERE series_id = ? AND start_utc >= ?`
    ).run(body.busId, body.title, body.quantity, body.notes ?? null, nowUtc(), series.id, booking.start_utc);
    return affected.length;
  })();

  res.json({ ok: true, count });
});

bookingsRouter.delete('/:id', (req, res) => {
  const booking = loadBooking(Number(req.params.id));
  requireOwnership(booking, req);

  const scope = req.query.scope === 'series' ? 'series' : 'single';

  const count = db.transaction(() => {
    if (scope === 'series' && booking.series_id) {
      // Diesen und alle folgenden Termine der Serie löschen
      const info = db
        .prepare('DELETE FROM bookings WHERE series_id = ? AND start_utc >= ?')
        .run(booking.series_id, booking.start_utc);
      cleanupSeries(booking.series_id);
      return info.changes;
    }
    db.prepare('DELETE FROM bookings WHERE id = ?').run(booking.id);
    if (booking.series_id) cleanupSeries(booking.series_id);
    return 1;
  })();

  res.json({ ok: true, count });
});
