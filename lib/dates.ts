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
