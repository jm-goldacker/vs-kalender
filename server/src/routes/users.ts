import bcrypt from 'bcrypt';
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { asyncHandler } from '../middleware/auth';
import type { Role, UserDto } from '../types';

interface UserRow {
  id: number;
  username: string;
  display_name: string;
  role: Role;
  is_active: number;
}

const createSchema = z.object({
  username: z.string().trim().min(2, 'Benutzername muss mindestens 2 Zeichen haben').max(50),
  displayName: z.string().trim().min(1).max(100),
  password: z.string().min(8, 'Das Passwort muss mindestens 8 Zeichen haben'),
  role: z.enum(['admin', 'member']).default('member'),
});

const updateSchema = z.object({
  displayName: z.string().trim().min(1).max(100).optional(),
  role: z.enum(['admin', 'member']).optional(),
  isActive: z.boolean().optional(),
});

const passwordSchema = z.object({
  password: z.string().min(8, 'Das Passwort muss mindestens 8 Zeichen haben'),
});

function toDto(row: UserRow): UserDto {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    role: row.role,
    isActive: row.is_active === 1,
  };
}

export const usersRouter = Router();

usersRouter.get('/', (_req, res) => {
  const rows = db
    .prepare('SELECT id, username, display_name, role, is_active FROM users ORDER BY display_name')
    .all() as UserRow[];
  res.json(rows.map(toDto));
});

usersRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const body = createSchema.parse(req.body);
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(body.username);
    if (existing) {
      return res.status(409).json({ error: 'Dieser Benutzername ist bereits vergeben' });
    }
    const hash = await bcrypt.hash(body.password, 12);
    const info = db
      .prepare('INSERT INTO users (username, password_hash, display_name, role) VALUES (?, ?, ?, ?)')
      .run(body.username, hash, body.displayName, body.role);
    const row = db
      .prepare('SELECT id, username, display_name, role, is_active FROM users WHERE id = ?')
      .get(info.lastInsertRowid) as UserRow;
    res.status(201).json(toDto(row));
  })
);

usersRouter.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  const body = updateSchema.parse(req.body);
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
  if (!row) return res.status(404).json({ error: 'Benutzer nicht gefunden' });

  if (id === req.session.userId && (body.role === 'member' || body.isActive === false)) {
    return res.status(400).json({ error: 'Du kannst dein eigenes Konto nicht herabstufen oder deaktivieren' });
  }

  db.prepare(
    'UPDATE users SET display_name = ?, role = ?, is_active = ? WHERE id = ?'
  ).run(
    body.displayName ?? row.display_name,
    body.role ?? row.role,
    body.isActive === undefined ? row.is_active : body.isActive ? 1 : 0,
    id
  );
  const updated = db
    .prepare('SELECT id, username, display_name, role, is_active FROM users WHERE id = ?')
    .get(id) as UserRow;
  res.json(toDto(updated));
});

usersRouter.put(
  '/:id/password',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const { password } = passwordSchema.parse(req.body);
    const row = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
    if (!row) return res.status(404).json({ error: 'Benutzer nicht gefunden' });
    const hash = await bcrypt.hash(password, 12);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, id);
    res.json({ ok: true });
  })
);
