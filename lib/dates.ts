/**
 * Turns a typed `YYYY-MM-DD` into the `yyyy-MM-ddTHH:mm:ss` a Java
 * `LocalDateTime` field needs (Jackson refuses a bare date). Returns null
 * when the input isn't a real calendar date, so the screen can say so
 * before the request goes out. A value that already carries a time (e.g.
 * one read back from a response) passes through unchanged.
 */
export function toLocalDateTime(input: string): string | null {
  const value = input.trim();
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) return value;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return `${value}T00:00:00`;
}

/**
 * Reads a backend `LocalDateTime` (`2026-07-29T03:14:37.947025` — no zone,
 * often microseconds) as device-local time. Built from its parts rather
 * than `new Date(string)`, whose handling of a zoneless, six-digit-fraction
 * string differs between JS engines. Returns null for anything unparseable.
 */
export function parseLocalDateTime(value: string | null | undefined): Date | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2}))?)?/.exec(value);
  if (!m) return null;
  const [, y, mo, d, h = '0', mi = '0', s = '0'] = m;
  return new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s));
}

/** `yyyy-MM-dd` for a device-local date — the format the backend's LocalDate filters take. */
export function toIsoDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** `14:32` — 24-hour, mono-friendly. */
export function formatTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/** `14 Oct 2026`, or `Today` / `Yesterday` relative to `now`. */
export function formatDayLabel(date: Date, now: Date = new Date()): string {
  const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((start(now) - start(date)) / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}
