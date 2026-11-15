import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../auth/AuthContext';
import { getUnreadCount } from '../api/notifications';

/**
 * Unread notifications for the bell and the side menu. Refreshed whenever the
 * screen comes back into view, and when `refreshKey` changes (the side menu
 * opening). null when the count couldn't be read: the badge just hides.
 */
export function useUnreadCount(refreshKey?: unknown): number | null {
  const { token } = useAuth();
  const [count, setCount] = useState<number | null>(null);

  const load = useCallback(() => {
    if (!token) return;
    getUnreadCount(token)
      .then((r) => setCount(r.unreadCount))
      .catch(() => setCount(null));
  }, [token]);

  useFocusEffect(load);
  useEffect(() => {
    if (refreshKey !== undefined) load();
  }, [load, refreshKey]);

  return count;
}
