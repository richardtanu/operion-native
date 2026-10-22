import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { AppState } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { getOriginNodeId } from '../lib/originNodeId';
import { processPending } from './outboxProcessor';
import { enqueue as storeEnqueue, listAll, resetStuckSending, retry as storeRetry } from './outboxStore';
import type { EnqueueInput, OutboxItem } from './types';

const POLL_INTERVAL_MS = 15_000;

type OutboxContextValue = {
  items: OutboxItem[];
  enqueue: (input: EnqueueInput) => Promise<string>;
  retryItem: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
};

const OutboxContext = createContext<OutboxContextValue | undefined>(undefined);

export function OutboxProvider({ children }: PropsWithChildren) {
  const { token } = useAuth();
  const [items, setItems] = useState<OutboxItem[]>([]);
  const tokenRef = useRef(token);
  tokenRef.current = token;

  const refresh = useCallback(async () => {
    setItems(await listAll());
  }, []);

  const runProcessor = useCallback(async () => {
    await processPending(tokenRef.current);
    await refresh();
  }, [refresh]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Rows left 'sending' mean the app died mid-request last session —
      // this is the case the outbox exists to survive (plan.md §1).
      await resetStuckSending();
      if (cancelled) return;
      await runProcessor();
    })();

    const interval = setInterval(runProcessor, POLL_INTERVAL_MS);
    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') runProcessor();
    });

    return () => {
      cancelled = true;
      clearInterval(interval);
      appStateSub.remove();
    };
  }, [runProcessor]);

  const value = useMemo<OutboxContextValue>(
    () => ({
      items,
      enqueue: async (input) => {
        const originNodeId = await getOriginNodeId();
        const item = await storeEnqueue(input, originNodeId);
        await refresh();
        // Fire the processor immediately for optimistic-feeling delivery;
        // the interval/foreground triggers above are the durability net.
        runProcessor();
        return item.id;
      },
      retryItem: async (id) => {
        await storeRetry(id);
        await refresh();
        runProcessor();
      },
      refresh,
    }),
    [items, refresh, runProcessor],
  );

  return <OutboxContext.Provider value={value}>{children}</OutboxContext.Provider>;
}

export function useOutbox(): OutboxContextValue {
  const ctx = useContext(OutboxContext);
  if (!ctx) throw new Error('useOutbox must be used within an OutboxProvider');
  return ctx;
}
