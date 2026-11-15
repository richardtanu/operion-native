import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { getTenantTree } from '../api/tenants';

export type StoreInfo = { id: string; name: string; code: string; atHq: boolean };

/**
 * The store you're signed in at: the first node of your tenant tree. HQ is
 * the node with no parent. null until it loads, or if it can't.
 */
export function useStoreInfo(): StoreInfo | null {
  const { token } = useAuth();
  const [store, setStore] = useState<StoreInfo | null>(null);

  useEffect(() => {
    if (!token) return;
    getTenantTree(token)
      .then((tree) => {
        const own = tree[0];
        setStore(own ? { id: own.id, name: own.name, code: own.code, atHq: own.parentId == null } : null);
      })
      .catch(() => setStore(null));
  }, [token]);

  return store;
}
