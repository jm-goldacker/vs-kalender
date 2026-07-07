import { HttpError } from './errors';

/**
 * Alle Zeitstempel werden einheitlich als ISO-8601-UTC mit Millisekunden
 * gespeichert (Format von Date.toISOString()), damit String-Vergleiche in
 * SQLite der zeitlichen Ordnung entsprechen.
 */
export function normalizeUtc(value: string): string {
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) {
    throw new HttpError(400, `Ungültiger Zeitstempel: ${value}`);
  }
  return new Date(ms).toISOString();
}

export function nowUtc(): string {
  return new Date().toISOString();
}
