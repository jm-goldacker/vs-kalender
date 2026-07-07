const dateTimeFmt = new Intl.DateTimeFormat('de-DE', {
  weekday: 'short',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const timeFmt = new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' });

export function formatDateTime(iso: string): string {
  return `${dateTimeFmt.format(new Date(iso))} Uhr`;
}

export function formatRange(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (start.toDateString() === end.toDateString()) {
    return `${dateTimeFmt.format(start)} – ${timeFmt.format(end)} Uhr`;
  }
  return `${dateTimeFmt.format(start)} – ${dateTimeFmt.format(end)} Uhr`;
}

/** Date → Wert für <input type="datetime-local"> in lokaler Zeit */
export function toLocalInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
