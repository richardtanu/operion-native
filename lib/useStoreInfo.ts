import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../auth/AuthContext';
import { getTenantTree } from '../api/tenants';

export type StoreInfo = { id: string; name: string; code: string; atHq: boolean };

/**
 * The store you're signed in at: the first node of your tenant tree. HQ is
 * the node with no parent. Read again each time the screen comes into view,
 * so one failed request over a flaky tunnel doesn't stick. null until it
 * loads, or if it can't; callers fall back to the profile's tenant name and
 * code.
 */
export function useStoreInfo(): StoreInfo | null {
  const { token } = useAuth();
  const [store, setStore] = useState<StoreInfo | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!token) return;
      getTenantTree(token)
        .then((tree) => {
          const own = tree[0];
          const next = own ? { id: own.id, name: own.name, code: own.code, atHq: own.parentId == null } : null;
          // Keep the same object when nothing changed, so screens that
          // depend on it don't reload on every visit.
          setStore((prev) =>
            prev && next && prev.id === next.id && prev.name === next.name && prev.code === next.code && prev.atHq === next.atHq ? prev : next,
          );
        })
        .catch(() => undefined);
    }, [token]),
  );

  return store;
}
