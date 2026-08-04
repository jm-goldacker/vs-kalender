import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { requireAdmin } from '../middleware/auth';
import { checkAvailability } from '../services/conflicts';
import { normalizeUtc } from '../time';
import type { BusDto } from '../types';

interface BusRow {
  id: number;
  name: string;
  category: 'fahrzeug' | 'geraet';
  license_plate: string | null;
  seats: number | null;
  color: string;
  is_active: number;
  quantity: number | null;
}

const busSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    category: z.enum(['fahrzeug', 'geraet']).default('fahrzeug'),
    licensePlate: z.string().trim().max(20).nullish(),
    seats: z.number().int().min(1).max(200).nullish(),
    quantity: z.number().int().min(1).max(100000).nullish(),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Ungültige Farbe'),
  })
  .superRefine((val, ctx) => {
    if (val.category === 'fahrzeug') {
      if (!val.licensePlate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['licensePlate'],
          message: 'Für Fahrzeuge ist ein Kennzeichen erforderlich',
        });
      }
      if (!val.seats) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['seats'],
          message: 'Für Fahrzeuge ist die Anzahl der Sitzplätze erforderlich',
        });
      }
    }
    if (val.category === 'geraet' && !val.quantity) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['quantity'],
        message: 'Für Geräte ist die Anzahl erforderlich',
      });
    }
  });

function toDto(row: BusRow): BusDto {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    licensePlate: row.license_plate,
    seats: row.seats,
    quantity: row.quantity,
    color: row.color,
    isActive: row.is_active === 1,
  };
}

/** Geräte tragen weder Kennzeichen noch Sitzplätze, Fahrzeuge keine Stückzahl */
function normalized(body: z.infer<typeof busSchema>) {
  const geraet = body.category === 'geraet';
  return {
    name: body.name,
    category: body.category,
    licensePlate: geraet ? null : (body.licensePlate ?? null),
    seats: geraet ? null : (body.seats ?? null),
    quantity: geraet ? (body.quantity ?? null) : null,
    color: body.color,
  };
}

export const busesRouter = Router();

busesRouter.get('/', (req, res) => {
  const includeInactive = req.query.all === '1' && req.session.role === 'admin';
  const rows = db
    .prepare(
      `SELECT * FROM buses ${includeInactive ? '' : 'WHERE is_active = 1'} ORDER BY category, name`
    )
    .all() as BusRow[];
  res.json(rows.map(toDto));
});

busesRouter.post('/', requireAdmin, (req, res) => {
  const body = normalized(busSchema.parse(req.body));
  const info = db
    .prepare(
      'INSERT INTO buses (name, category, license_plate, seats, quantity, color) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .run(body.name, body.category, body.licensePlate, body.seats, body.quantity, body.color);
  const row = db.prepare('SELECT * FROM buses WHERE id = ?').get(info.lastInsertRowid) as BusRow;
  res.status(201).json(toDto(row));
});

busesRouter.put('/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const row = db.prepare('SELECT * FROM buses WHERE id = ?').get(id) as BusRow | undefined;
  if (!row) return res.status(404).json({ error: 'Ressource nicht gefunden' });
  const parsed = busSchema.and(z.object({ isActive: z.boolean().optional() })).parse(req.body);
  const body = normalized(parsed);
  db.prepare(
    `UPDATE buses SET name = ?, category = ?, license_plate = ?, seats = ?, quantity = ?, color = ?, is_active = ?
     WHERE id = ?`
  ).run(
    body.name,
    body.category,
    body.licensePlate,
    body.seats,
    body.quantity,
    body.color,
    parsed.isActive === undefined ? row.is_active : parsed.isActive ? 1 : 0,
    id
  );
  const updated = db.prepare('SELECT * FROM buses WHERE id = ?').get(id) as BusRow;
  res.json(toDto(updated));
});

busesRouter.delete('/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const row = db.prepare('SELECT id FROM buses WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: 'Ressource nicht gefunden' });
  db.prepare('UPDATE buses SET is_active = 0 WHERE id = ?').run(id);
  res.json({ ok: true });
});

/** Freie Stückzahl einer Ressource im gewählten Zeitraum, für die Live-Anzeige im Buchungsformular. */
busesRouter.get('/:id/availability', (req, res) => {
  const id = Number(req.params.id);
  const row = db.prepare('SELECT * FROM buses WHERE id = ?').get(id) as BusRow | undefined;
  if (!row) return res.status(404).json({ error: 'Ressource nicht gefunden' });

  const start = normalizeUtc(String(req.query.start ?? ''));
  const end = normalizeUtc(String(req.query.end ?? ''));
  const excludeBookingId = req.query.excludeBookingId
    ? Number(req.query.excludeBookingId)
    : undefined;

  const total = row.quantity ?? 1;
  const { available } = checkAvailability({ busId: id, start, end }, total, { bookingId: excludeBookingId });
  res.json({ total, available });
});
