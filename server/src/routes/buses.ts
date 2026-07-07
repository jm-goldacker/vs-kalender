import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { requireAdmin } from '../middleware/auth';
import type { BusDto } from '../types';

interface BusRow {
  id: number;
  name: string;
  license_plate: string;
  seats: number;
  color: string;
  is_active: number;
}

const busSchema = z.object({
  name: z.string().trim().min(1).max(100),
  licensePlate: z.string().trim().min(1).max(20),
  seats: z.number().int().min(1).max(200),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Ungültige Farbe'),
});

function toDto(row: BusRow): BusDto {
  return {
    id: row.id,
    name: row.name,
    licensePlate: row.license_plate,
    seats: row.seats,
    color: row.color,
    isActive: row.is_active === 1,
  };
}

export const busesRouter = Router();

busesRouter.get('/', (req, res) => {
  const includeInactive = req.query.all === '1' && req.session.role === 'admin';
  const rows = db
    .prepare(`SELECT * FROM buses ${includeInactive ? '' : 'WHERE is_active = 1'} ORDER BY name`)
    .all() as BusRow[];
  res.json(rows.map(toDto));
});

busesRouter.post('/', requireAdmin, (req, res) => {
  const body = busSchema.parse(req.body);
  const info = db
    .prepare('INSERT INTO buses (name, license_plate, seats, color) VALUES (?, ?, ?, ?)')
    .run(body.name, body.licensePlate, body.seats, body.color);
  const row = db.prepare('SELECT * FROM buses WHERE id = ?').get(info.lastInsertRowid) as BusRow;
  res.status(201).json(toDto(row));
});

busesRouter.put('/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const row = db.prepare('SELECT * FROM buses WHERE id = ?').get(id) as BusRow | undefined;
  if (!row) return res.status(404).json({ error: 'Bus nicht gefunden' });
  const body = busSchema.extend({ isActive: z.boolean().optional() }).parse(req.body);
  db.prepare(
    'UPDATE buses SET name = ?, license_plate = ?, seats = ?, color = ?, is_active = ? WHERE id = ?'
  ).run(
    body.name,
    body.licensePlate,
    body.seats,
    body.color,
    body.isActive === undefined ? row.is_active : body.isActive ? 1 : 0,
    id
  );
  const updated = db.prepare('SELECT * FROM buses WHERE id = ?').get(id) as BusRow;
  res.json(toDto(updated));
});

busesRouter.delete('/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const row = db.prepare('SELECT id FROM buses WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: 'Bus nicht gefunden' });
  db.prepare('UPDATE buses SET is_active = 0 WHERE id = ?').run(id);
  res.json({ ok: true });
});
