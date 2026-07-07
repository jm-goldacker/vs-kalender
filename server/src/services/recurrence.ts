import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';

export const TIMEZONE = 'Europe/Berlin';
export const MAX_OCCURRENCES = 100;
const MAX_RANGE_DAYS = 366;

export class RecurrenceError extends Error {}

export interface OccurrenceTimes {
  start: string;
  end: string;
}

function shiftDate(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function diffDays(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

/**
 * Expandiert eine wöchentliche Serie ausgehend vom ersten Termin (UTC).
 * Die Expansion arbeitet auf der lokalen Wanduhrzeit (Europe/Berlin), damit
 * z.B. "jeden Dienstag 18:00" auch über die Sommerzeit-Umstellung hinweg
 * um 18:00 Uhr bleibt. `until` ist ein lokales Datum (yyyy-MM-dd, inklusiv).
 */
export function expandWeekly(
  startUtc: string,
  endUtc: string,
  interval: number,
  until: string
): OccurrenceTimes[] {
  if (!Number.isInteger(interval) || interval < 1 || interval > 8) {
    throw new RecurrenceError('Das Wiederholungs-Intervall muss zwischen 1 und 8 Wochen liegen');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(until)) {
    throw new RecurrenceError('Ungültiges Enddatum der Serie');
  }

  const startDate = formatInTimeZone(startUtc, TIMEZONE, 'yyyy-MM-dd');
  const startTime = formatInTimeZone(startUtc, TIMEZONE, 'HH:mm:ss');
  const endDate = formatInTimeZone(endUtc, TIMEZONE, 'yyyy-MM-dd');
  const endTime = formatInTimeZone(endUtc, TIMEZONE, 'HH:mm:ss');

  if (until < startDate) {
    throw new RecurrenceError('Das Enddatum der Serie liegt vor dem ersten Termin');
  }
  if (diffDays(startDate, until) > MAX_RANGE_DAYS) {
    throw new RecurrenceError('Serien sind auf maximal 12 Monate begrenzt');
  }

  const durationDays = diffDays(startDate, endDate);
  const occurrences: OccurrenceTimes[] = [];

  for (let i = 0; ; i++) {
    const date = shiftDate(startDate, i * 7 * interval);
    if (date > until) break;
    occurrences.push({
      start: fromZonedTime(`${date}T${startTime}`, TIMEZONE).toISOString(),
      end: fromZonedTime(`${shiftDate(date, durationDays)}T${endTime}`, TIMEZONE).toISOString(),
    });
    if (occurrences.length > MAX_OCCURRENCES) {
      throw new RecurrenceError(`Eine Serie darf höchstens ${MAX_OCCURRENCES} Termine umfassen`);
    }
  }

  return occurrences;
}
