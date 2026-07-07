import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

const dbPath =
  process.env.DATABASE_PATH ?? path.join(__dirname, '..', '..', 'data', 'bus-kalender.db');

if (dbPath !== ':memory:') {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
}

export const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');

const migrations: string[] = [
  `
  CREATE TABLE users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    display_name  TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    is_active     INTEGER NOT NULL DEFAULT 1,
    created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  CREATE TABLE buses (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    license_plate TEXT NOT NULL,
    seats         INTEGER NOT NULL,
    color         TEXT NOT NULL,
    is_active     INTEGER NOT NULL DEFAULT 1,
    created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  CREATE TABLE booking_series (
    id         TEXT PRIMARY KEY,
    freq       TEXT NOT NULL CHECK (freq IN ('weekly')),
    interval   INTEGER NOT NULL DEFAULT 1,
    until      TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  CREATE TABLE bookings (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    bus_id     INTEGER NOT NULL REFERENCES buses(id),
    user_id    INTEGER NOT NULL REFERENCES users(id),
    title      TEXT NOT NULL,
    start_utc  TEXT NOT NULL,
    end_utc    TEXT NOT NULL,
    series_id  TEXT REFERENCES booking_series(id),
    notes      TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    CHECK (end_utc > start_utc)
  );

  CREATE INDEX idx_bookings_bus_time ON bookings(bus_id, start_utc, end_utc);
  CREATE INDEX idx_bookings_series ON bookings(series_id);
  CREATE INDEX idx_bookings_user ON bookings(user_id);
  `,
];

export function migrate(): void {
  db.exec('CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL)');
  const row = db.prepare('SELECT version FROM schema_version').get() as
    | { version: number }
    | undefined;
  let version = row?.version ?? 0;
  if (!row) {
    db.prepare('INSERT INTO schema_version (version) VALUES (0)').run();
  }
  while (version < migrations.length) {
    const target = version + 1;
    db.transaction(() => {
      db.exec(migrations[version]);
      db.prepare('UPDATE schema_version SET version = ?').run(target);
    })();
    version = target;
  }
}
