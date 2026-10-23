import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { getBurnRates, getStockSummary } from '../api/inventory';
import { listParts } from '../api/parts';
import { ApiError } from '../api/httpError';
import { buildStockLines, type StockLine } from './stockLevel';

/**
 * INV-01/02: the stock list, usage and item flags in three calls joined on
 * the phone (BE-26 may fold the first two into one). Reloads whenever the
 * screen comes back into view, e.g. after an approved adjustment. Usage
 * failing alone isn't fatal: every item then falls back to minimum stock.
 */
export function useStockLines(token: string | null) {
  const [lines, setLines] = useState<StockLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [summary, burns, parts] = await Promise.all([
        getStockSummary(token),
        getBurnRates(token).catch(() => []),
        listParts(token).catch(() => []),
      ]);
      setLines(buildStockLines(summary, burns, parts));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load stock.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return { lines, loading, error, reload: load };
}
