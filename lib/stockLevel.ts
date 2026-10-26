import type { BurnRateResponse, PartResponse, ServerLowBecause, StockSummaryRow } from '../api/types';

/**
 * The one meaning of "low" (decided 23 Oct, on the server since BE-27): with
 * usage data an item is low when it runs out before its target days; without,
 * when it's at or below minimum stock. Out of stock (≤ 0) shows on top. The
 * app reads the server's answer from the stock summary — it no longer works
 * it out itself — and adds burn rate only for the suggested amount.
 */
export type LowBecause = 'OUT' | ServerLowBecause;

export type StockLine = {
  partId: string;
  name: string;
  tenantId: string;
  tenantName: string;
  catalogPartId: string | null;
  currentStock: number;
  minimumStock: number | null;
  /** Null without usage data — shown as "no usage data", never "0 days". */
  daysOfCover: number | null;
  targetDays: number | null;
  suggestedQty: number | null;
  lowBecause: LowBecause | null;
  part: PartResponse | null;
};

/** The server's verdict on one stock-summary row, with out of stock first. */
export function lowOf(row: StockSummaryRow): LowBecause | null {
  return row.status === 'OUT_OF_STOCK' ? 'OUT' : row.lowBecause;
}

export function buildStockLines(summary: StockSummaryRow[], burns: BurnRateResponse[], parts: PartResponse[]): StockLine[] {
  const burnById = new Map(burns.map((b) => [b.partId, b]));
  const partById = new Map(parts.map((p) => [p.id, p]));
  return summary.map((s) => {
    const part = partById.get(s.partId) ?? null;
    return {
      partId: s.partId,
      name: s.partName,
      tenantId: s.tenantId,
      tenantName: s.tenantName,
      catalogPartId: s.catalogPartId,
      currentStock: s.currentStock,
      minimumStock: s.minimumStock,
      daysOfCover: s.daysOfCover,
      targetDays: s.targetDays,
      suggestedQty: suggestedAmount(s.currentStock, s.minimumStock, burnById.get(s.partId), part),
      lowBecause: lowOf(s),
      part,
    };
  });
}

/** Burn rate's suggestion when it has one, else the item's reorder quantity, else back up to minimum. */
function suggestedAmount(currentStock: number, minimumStock: number | null, burn: BurnRateResponse | undefined, part: PartResponse | null): number | null {
  if (burn?.suggestedQty != null && burn.suggestedQty > 0) return burn.suggestedQty;
  if (part?.reorderQuantity != null && part.reorderQuantity > 0) return part.reorderQuantity;
  if (minimumStock != null && minimumStock > currentStock) return minimumStock - currentStock;
  return null;
}

/** Worst first: out, then soonest to run out, then furthest below minimum. */
export function worstFirst(a: StockLine, b: StockLine): number {
  const rank = (l: StockLine) => (l.lowBecause === 'OUT' ? 0 : l.lowBecause === 'RUNS_OUT_SOON' ? 1 : l.lowBecause === 'BELOW_MINIMUM' ? 2 : 3);
  if (rank(a) !== rank(b)) return rank(a) - rank(b);
  if (a.lowBecause === 'RUNS_OUT_SOON') return (a.daysOfCover ?? 0) - (b.daysOfCover ?? 0);
  return a.currentStock - (a.minimumStock ?? 0) - (b.currentStock - (b.minimumStock ?? 0));
}

/** "~3 days left", "no usage data". */
export function coverLabel(line: StockLine): string {
  if (line.daysOfCover == null) return 'no usage data';
  return `~${Math.max(0, Math.round(line.daysOfCover))} days left`;
}

/** Why it's low, in words — the screens always say which rule fired. */
export function lowReasonLabel(line: StockLine): string | null {
  switch (line.lowBecause) {
    case 'OUT':
      return 'Out of stock';
    case 'RUNS_OUT_SOON':
      return `Runs out before its ${line.targetDays ?? 14}-day target`;
    case 'BELOW_MINIMUM':
      return `Below minimum ${line.minimumStock ?? 0}`;
    default:
      return null;
  }
}

/**
 * Prefill for PROC-01 / PROC-07: `partId:qty,partId:qty`. Router params are
 * strings, so the lines travel as one compact string.
 */
export function encodeLines(lines: { partId: string; quantity: number | null }[]): string {
  return lines.map((l) => `${l.partId}:${l.quantity ?? ''}`).join(',');
}

export function decodeLines(value: string | string[] | undefined): { partId: string; quantity: string }[] {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return [];
  return raw
    .split(',')
    .map((pair) => {
      const [partId, quantity = ''] = pair.split(':');
      return { partId, quantity };
    })
    .filter((l) => l.partId);
}
