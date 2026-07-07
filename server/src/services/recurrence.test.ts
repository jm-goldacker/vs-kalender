import { describe, expect, it } from 'vitest';
import { expandWeekly, RecurrenceError } from './recurrence';

// EU-Sommerzeit 2026: Beginn 29. März, Ende 25. Oktober

describe('expandWeekly', () => {
  it('hält die lokale Uhrzeit über den Sommerzeit-Beginn (März) konstant', () => {
    // Dienstag 24.03.2026 18:00–20:00 Europe/Berlin (CET = UTC+1)
    const occ = expandWeekly(
      '2026-03-24T17:00:00.000Z',
      '2026-03-24T19:00:00.000Z',
      1,
      '2026-04-07'
    );
    expect(occ).toEqual([
      { start: '2026-03-24T17:00:00.000Z', end: '2026-03-24T19:00:00.000Z' }, // CET
      { start: '2026-03-31T16:00:00.000Z', end: '2026-03-31T18:00:00.000Z' }, // CEST
      { start: '2026-04-07T16:00:00.000Z', end: '2026-04-07T18:00:00.000Z' }, // CEST
    ]);
  });

  it('hält die lokale Uhrzeit über das Sommerzeit-Ende (Oktober) konstant', () => {
    // Dienstag 20.10.2026 18:00–19:00 Europe/Berlin (CEST = UTC+2)
    const occ = expandWeekly(
      '2026-10-20T16:00:00.000Z',
      '2026-10-20T17:00:00.000Z',
      1,
      '2026-11-03'
    );
    expect(occ).toEqual([
      { start: '2026-10-20T16:00:00.000Z', end: '2026-10-20T17:00:00.000Z' }, // CEST
      { start: '2026-10-27T17:00:00.000Z', end: '2026-10-27T18:00:00.000Z' }, // CET
      { start: '2026-11-03T17:00:00.000Z', end: '2026-11-03T18:00:00.000Z' }, // CET
    ]);
  });

  it('berücksichtigt das Intervall (alle 2 Wochen)', () => {
    const occ = expandWeekly(
      '2026-07-06T08:00:00.000Z',
      '2026-07-06T10:00:00.000Z',
      2,
      '2026-08-03'
    );
    expect(occ.map((o) => o.start)).toEqual([
      '2026-07-06T08:00:00.000Z',
      '2026-07-20T08:00:00.000Z',
      '2026-08-03T08:00:00.000Z',
    ]);
  });

  it('erhält die Dauer mehrtägiger Buchungen (Wochenendfahrt)', () => {
    // Freitag 18:00 bis Sonntag 20:00
    const occ = expandWeekly(
      '2026-07-10T16:00:00.000Z',
      '2026-07-12T18:00:00.000Z',
      1,
      '2026-07-17'
    );
    expect(occ).toEqual([
      { start: '2026-07-10T16:00:00.000Z', end: '2026-07-12T18:00:00.000Z' },
      { start: '2026-07-17T16:00:00.000Z', end: '2026-07-19T18:00:00.000Z' },
    ]);
  });

  it('schließt das Enddatum ein, wenn es genau auf einen Termin fällt', () => {
    const occ = expandWeekly(
      '2026-07-06T08:00:00.000Z',
      '2026-07-06T10:00:00.000Z',
      1,
      '2026-07-13'
    );
    expect(occ).toHaveLength(2);
  });

  it('lehnt ein Enddatum vor dem ersten Termin ab', () => {
    expect(() =>
      expandWeekly('2026-07-06T08:00:00.000Z', '2026-07-06T10:00:00.000Z', 1, '2026-07-01')
    ).toThrow(RecurrenceError);
  });

  it('lehnt Serien über 12 Monate ab', () => {
    expect(() =>
      expandWeekly('2026-07-06T08:00:00.000Z', '2026-07-06T10:00:00.000Z', 1, '2027-08-01')
    ).toThrow(RecurrenceError);
  });

  it('lehnt ungültige Intervalle ab', () => {
    expect(() =>
      expandWeekly('2026-07-06T08:00:00.000Z', '2026-07-06T10:00:00.000Z', 0, '2026-08-01')
    ).toThrow(RecurrenceError);
  });
});
