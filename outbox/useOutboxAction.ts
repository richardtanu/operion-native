import { useCallback, useMemo, useState } from 'react';
import type { SyncState } from '../components/SyncStateIndicator';
import { useOutbox } from './OutboxProvider';
import type { EnqueueInput } from './types';

type UseOutboxActionResult = {
  state: SyncState | 'idle';
  error: string | null;
  enqueue: (input: EnqueueInput) => Promise<void>;
  retry: () => void;
};

/**
 * The hook screens use for any write that should go through the outbox
 * (plan.md §1: writes get a pending/queued state, never rendered as an
 * error). Collapses the store's 'pending'/'sending' status down to the one
 * user-facing 'queued' state — that distinction is an implementation detail
 * the UI doesn't need.
 *
 * Not for approval/authorization-style actions — those are blocking-error /
 * manual-retry per plan.md §3 and should call api/client.ts directly instead.
 */
export function useOutboxAction(): UseOutboxActionResult {
  const { items, enqueue: enqueueItem, retryItem } = useOutbox();
  const [id, setId] = useState<string | null>(null);

  const item = useMemo(() => items.find((i) => i.id === id) ?? null, [items, id]);

  const state: UseOutboxActionResult['state'] = !item
    ? 'idle'
    : item.status === 'confirmed'
      ? 'confirmed'
      : item.status === 'failed'
        ? 'failed'
        : 'queued';

  const enqueue = useCallback(
    async (input: EnqueueInput) => {
      const newId = await enqueueItem(input);
      setId(newId);
    },
    [enqueueItem],
  );

  const retry = useCallback(() => {
    if (id) retryItem(id);
  }, [id, retryItem]);

  return { state, error: item?.lastError ?? null, enqueue, retry };
}
