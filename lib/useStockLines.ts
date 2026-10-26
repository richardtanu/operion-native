import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { getBurnRates, getStockSummary } from '../api/inventory';
import { listParts } from '../api/parts';
import { ApiError } from '../api/httpError';
import { buildStockLines, type StockLine } from './stockLevel';

/**
 * INV-01/02/03: the stock list (with the server's "low" verdict, BE-27), the
 * suggested amounts from burn rate, and the item flags, joined on partId.
 * `tenantId` narrows all three to one store (BE-26). Reloads whenever the
 * screen comes back into view, e.g. after an approved adjustment. Burn rate
 * or parts failing alone isn't fatal: suggestions and HQ flags just go blank.
 */
export function useStockLines(token: string | null, tenantId?: string) {
  const [lines, setLines] = useState<StockLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [summary, burns, parts] = await Promise.all([
        getStockSummary(token, tenantId),
        getBurnRates(token, tenantId).catch(() => []),
        listParts(token, tenantId).catch(() => []),
      ]);
      setLines(buildStockLines(summary, burns, parts));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load stock.');
    } finally {
      setLoading(false);
    }
  }, [token, tenantId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return { lines, loading, error, reload: load };
}
