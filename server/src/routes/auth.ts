import bcrypt from 'bcrypt';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { db } from '../db';
import { asyncHandler, requireAuth } from '../middleware/auth';
import type { Role } from '../types';

interface UserRow {
  id: number;
  username: string;
  password_hash: string;
  display_name: string;
  role: Role;
  is_active: number;
}

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Zu viele Anmeldeversuche, bitte später erneut versuchen' },
});

const loginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});

const passwordSchema = z.object({
  oldPassword: z.string().min(1),
  newPassword: z.string().min(8, 'Das neue Passwort muss mindestens 8 Zeichen haben'),
});

function toDto(user: UserRow) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.display_name,
    role: user.role,
  };
}

export const authRouter = Router();

authRouter.post(
  '/login',
  loginLimiter,
  asyncHandler(async (req, res) => {
    const { username, password } = loginSchema.parse(req.body);
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as
      | UserRow
      | undefined;
    const valid = user && user.is_active === 1 && (await bcrypt.compare(password, user.password_hash));
    if (!valid) {
      return res.status(401).json({ error: 'Benutzername oder Passwort ist falsch' });
    }
    req.session.userId = user.id;
    req.session.role = user.role;
    res.json(toDto(user));
  })
);

authRouter.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

authRouter.get('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ? AND is_active = 1').get(req.session.userId) as
    | UserRow
    | undefined;
  if (!user) {
    return req.session.destroy(() => res.status(401).json({ error: 'Nicht angemeldet' }));
  }
  res.json(toDto(user));
});

authRouter.put(
  '/password',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = passwordSchema.parse(req.body);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId) as UserRow;
    if (!(await bcrypt.compare(oldPassword, user.password_hash))) {
      return res.status(400).json({ error: 'Das aktuelle Passwort ist falsch' });
    }
    const hash = await bcrypt.hash(newPassword, 12);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, user.id);
    res.json({ ok: true });
  })
);
