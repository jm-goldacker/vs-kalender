import fs from 'node:fs';
import path from 'node:path';
import express, { type NextFunction, type Request, type Response } from 'express';
import session from 'express-session';
import sqliteStoreFactory from 'better-sqlite3-session-store';
import { ZodError } from 'zod';
import { db, migrate } from './db';
import { seed } from './seed';
import { ConflictError, HttpError } from './errors';
import { RecurrenceError } from './services/recurrence';
import { requireAuth, requireAdmin } from './middleware/auth';
import { authRouter } from './routes/auth';
import { usersRouter } from './routes/users';
import { busesRouter } from './routes/buses';
import { bookingsRouter } from './routes/bookings';

const PORT = Number(process.env.PORT ?? 3001);

async function main(): Promise<void> {
  const sessionSecret =
    process.env.SESSION_SECRET ??
    (process.env.NODE_ENV === 'production' ? '' : 'nur-fuer-lokale-entwicklung');
  if (!sessionSecret) {
    console.error('FEHLER: Die Umgebungsvariable SESSION_SECRET muss gesetzt sein.');
    process.exit(1);
  }

  migrate();
  await seed();

  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json());

  const SqliteStore = sqliteStoreFactory(session);
  app.use(
    session({
      store: new SqliteStore({
        client: db,
        expired: { clear: true, intervalMs: 15 * 60 * 1000 },
      }),
      name: 'buskalender.sid',
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      rolling: true,
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.COOKIE_SECURE === 'true',
        maxAge: 30 * 24 * 60 * 60 * 1000,
      },
    })
  );

  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  app.use('/api/auth', authRouter);
  app.use('/api/users', requireAuth, requireAdmin, usersRouter);
  app.use('/api/buses', requireAuth, busesRouter);
  app.use('/api/bookings', requireAuth, bookingsRouter);
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Nicht gefunden' }));

  // Im Produktionsbetrieb liefert der Server das gebaute Frontend aus
  const publicDir = path.join(__dirname, '..', 'public');
  if (fs.existsSync(publicDir)) {
    app.use(express.static(publicDir));
    app.get('*', (_req, res) => res.sendFile(path.join(publicDir, 'index.html')));
  }

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ConflictError) {
      return res.status(409).json({
        error:
          err.available !== undefined && err.requested !== undefined
            ? `Nur noch ${Math.max(err.available, 0)} verfügbar (angefragt: ${err.requested})`
            : 'Diese Ressource ist in dem Zeitraum bereits gebucht',
        conflicts: err.conflicts.map((c) => ({
          id: c.id,
          title: c.title,
          start: c.start_utc,
          end: c.end_utc,
          userDisplayName: c.display_name,
        })),
        available: err.available,
        requested: err.requested,
      });
    }
    if (err instanceof ZodError) {
      return res.status(400).json({ error: err.issues[0]?.message ?? 'Ungültige Eingabe' });
    }
    if (err instanceof RecurrenceError) {
      return res.status(400).json({ error: err.message });
    }
    if (err instanceof HttpError) {
      return res.status(err.status).json({ error: err.message });
    }
    console.error(err);
    res.status(500).json({ error: 'Interner Serverfehler' });
  });

  app.listen(PORT, () => {
    console.log(`Bus-Kalender-Server läuft auf Port ${PORT}`);
  });
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
