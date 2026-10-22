/** `Rp 1.190.000` — Indonesian grouping, as the backend writes amounts in its own messages. Null → em dash. */
export function rp(n: number | null | undefined): string {
  return n == null ? '—' : `Rp ${Math.round(n).toLocaleString('id-ID')}`;
}
