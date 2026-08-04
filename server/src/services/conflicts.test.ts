import { beforeAll, describe, expect, it } from 'vitest';

process.env.DATABASE_PATH = ':memory:';
const { db, migrate } = await import('../db');
const { findConflicts, checkAvailability } = await import('./conflicts');

// Bestehende Buchung: Bus 1, 10:00–12:00 UTC
const START = '2026-08-01T10:00:00.000Z';
const END = '2026-08-01T12:00:00.000Z';

beforeAll(() => {
  migrate();
  db.prepare(
    "INSERT INTO users (id, username, password_hash, display_name, role) VALUES (1, 'max', 'x', 'Max', 'member')"
  ).run();
  db.prepare(
    "INSERT INTO buses (id, name, license_plate, seats, color) VALUES (1, 'Bus 1', 'MZ-AB 123', 20, '#ff0000'), (2, 'Bus 2', 'MZ-CD 456', 9, '#00ff00')"
  ).run();
  db.prepare(
    "INSERT INTO buses (id, name, category, quantity, color) VALUES (3, 'Bierzeltgarnitur', 'geraet', 27, '#0000ff')"
  ).run();
  db.prepare(
    "INSERT INTO booking_series (id, freq, interval, until) VALUES ('serie-1', 'weekly', 1, '2026-12-31')"
  ).run();
  db.prepare(
    `INSERT INTO bookings (id, bus_id, user_id, title, start_utc, end_utc, series_id)
     VALUES (1, 1, 1, 'Bestehend', ?, ?, NULL),
            (2, 1, 1, 'Serientermin', '2026-08-08T10:00:00.000Z', '2026-08-08T12:00:00.000Z', 'serie-1')`
  ).run(START, END);
  db.prepare(
    `INSERT INTO bookings (id, bus_id, user_id, title, start_utc, end_utc, quantity)
     VALUES (3, 3, 1, 'Sommerfest', ?, ?, 15),
            (4, 3, 1, 'Vereinsfeier', ?, ?, 5)`
  ).run(START, END, START, END);
});

describe('findConflicts', () => {
  it('erkennt teilweise Überlappung (neuer Termin beginnt mittendrin)', () => {
    const c = findConflicts({ busId: 1, start: '2026-08-01T11:00:00.000Z', end: '2026-08-01T13:00:00.000Z' });
    expect(c.map((x) => x.id)).toEqual([1]);
  });

  it('erkennt teilweise Überlappung (neuer Termin endet mittendrin)', () => {
    const c = findConflicts({ busId: 1, start: '2026-08-01T09:00:00.000Z', end: '2026-08-01T10:30:00.000Z' });
    expect(c.map((x) => x.id)).toEqual([1]);
  });

  it('erkennt umschließende Buchung', () => {
    const c = findConflicts({ busId: 1, start: '2026-08-01T09:00:00.000Z', end: '2026-08-01T13:00:00.000Z' });
    expect(c.map((x) => x.id)).toEqual([1]);
  });

  it('erkennt vollständig enthaltene Buchung', () => {
    const c = findConflicts({ busId: 1, start: '2026-08-01T10:30:00.000Z', end: '2026-08-01T11:00:00.000Z' });
    expect(c.map((x) => x.id)).toEqual([1]);
  });

  it('erkennt identische Zeiten', () => {
    const c = findConflicts({ busId: 1, start: START, end: END });
    expect(c.map((x) => x.id)).toEqual([1]);
  });

  it('meldet keinen Konflikt bei direkt angrenzenden Terminen', () => {
    expect(findConflicts({ busId: 1, start: '2026-08-01T08:00:00.000Z', end: START })).toEqual([]);
    expect(findConflicts({ busId: 1, start: END, end: '2026-08-01T14:00:00.000Z' })).toEqual([]);
  });

  it('meldet keinen Konflikt für einen anderen Bus', () => {
    expect(findConflicts({ busId: 2, start: START, end: END })).toEqual([]);
  });

  it('nimmt die eigene Buchung beim Bearbeiten aus', () => {
    const c = findConflicts({ busId: 1, start: START, end: END }, { bookingId: 1 });
    expect(c).toEqual([]);
  });

  it('nimmt die eigene Serie beim Serien-Update aus', () => {
    const c = findConflicts(
      { busId: 1, start: '2026-08-08T10:00:00.000Z', end: '2026-08-08T12:00:00.000Z' },
      { seriesId: 'serie-1' }
    );
    expect(c).toEqual([]);
  });

  it('findet Konflikte mit fremden Serien trotz Serien-Ausschluss', () => {
    const c = findConflicts(
      { busId: 1, start: '2026-08-01T10:00:00.000Z', end: '2026-08-01T11:00:00.000Z' },
      { seriesId: 'serie-1' }
    );
    expect(c.map((x) => x.id)).toEqual([1]);
  });
});

describe('checkAvailability', () => {
  it('summiert die Mengen überlappender Buchungen bei einem Gerät mit Stückzahl', () => {
    // Bus 3 (Bierzeltgarnitur, 27 Stück): bereits 15 + 5 = 20 gebucht im Zeitraum
    const { available } = checkAvailability({ busId: 3, start: START, end: END }, 27);
    expect(available).toBe(7);
  });

  it('nimmt die eigene Buchung beim Bearbeiten aus der Summe aus', () => {
    const { available } = checkAvailability(
      { busId: 3, start: START, end: END },
      27,
      { bookingId: 3 }
    );
    expect(available).toBe(22);
  });

  it('meldet die volle Stückzahl außerhalb des gebuchten Zeitraums als verfügbar', () => {
    const { available } = checkAvailability(
      { busId: 3, start: '2026-08-02T10:00:00.000Z', end: '2026-08-02T12:00:00.000Z' },
      27
    );
    expect(available).toBe(27);
  });

  it('verhält sich bei totalQuantity 1 (Fahrzeug) weiterhin exklusiv', () => {
    const { available } = checkAvailability({ busId: 1, start: START, end: END }, 1);
    expect(available).toBe(0);
  });
});
