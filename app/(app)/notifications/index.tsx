import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Callout, Card } from '../../../components';
import { useAuth } from '../../../auth/AuthContext';
import { listNotifications, markAllNotificationsRead, markNotificationRead } from '../../../api/notifications';
import { ApiError } from '../../../api/httpError';
import type { NotificationResponse } from '../../../api/types';
import { useTheme } from '../../../theme/ThemeContext';
import { textStyle } from '../../../theme/typeStyle';
import { formatDayLabel, formatTime, parseLocalDateTime } from '../../../lib/dates';


// Short, stencil-style labels for the known types; anything newer shows its raw name.
const TYPE_LABEL: Record<string, string> = {
  NEW_PURCHASE_REQUEST: 'New request',
  PURCHASE_REQUEST_ORDERED: 'Request ordered',
  PURCHASE_REQUEST_APPROVED: 'Request approved',
  PURCHASE_REQUEST_REJECTED: 'Request rejected',
  PURCHASE_REQUEST_AUTHORIZED: 'Request authorized',
  PURCHASE_AUTHORIZATION_CREATED: 'Ready to buy',
  REALISASI_ESCALATED: 'Needs approval',
  LOW_STOCK: 'Low stock',
  PART_END_OF_LIFE: 'Part end of life',
  PURCHASE_REQUEST_CANCELLED: 'Request cancelled',
  REIMBURSEMENT_PAID: 'Paid back',
  GOODS_SELF_RECEIVED: 'Self-received',
  STOCK_ADJUSTMENT_REQUESTED: 'Adjustment to approve',
};

// Notifications — the signed-in user's own inbox. Tapping one marks it
// read; nothing else happens on tap yet (the procurement screens have no
// per-record route to open). Unread is carried by weight and a dot in the
// info colour — never hazard yellow, which is reserved for scope gates.
export default function NotificationsScreen() {
  const { color, type: typeScale, radius } = useTheme();
  const { token } = useAuth();
  const [items, setItems] = useState<NotificationResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      setItems(await listNotifications(token));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load notifications.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const unread = items.filter((n) => !n.read).length;

  const markOne = async (n: NotificationResponse) => {
    if (n.read || !token) return;
    // Optimistic: flip it now, put it back if the server says no.
    setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    try {
      await markNotificationRead(n.id, token);
    } catch (err) {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: false } : x)));
      setError(err instanceof ApiError ? err.message : 'Could not mark it read.');
    }
  };

  const markAll = async () => {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      await markAllNotificationsRead(token);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not mark all read.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.surface }}>
      <ScrollView contentContainerClassName="gap-md px-xl pt-xl pb-xl">
        <View className="flex-row items-baseline justify-between" style={{ gap: 10 }}>
          <Text style={{ ...textStyle(typeScale.screenTitle), color: color.ink }}>Notifications</Text>
          <Text style={{ ...textStyle(typeScale.value), color: color.steel }}>{unread} unread</Text>
        </View>

        <Button label={busy ? 'Marking…' : 'Mark all read'} variant="secondary" disabled={busy || unread === 0} onPress={markAll} />

        {error ? <Callout tone="danger">{error}</Callout> : null}
        {loading && items.length === 0 ? <Text style={{ ...textStyle(typeScale.body), color: color.steel }}>Loading…</Text> : null}
        {!loading && !error && items.length === 0 ? (
          <Text style={{ ...textStyle(typeScale.body), color: color.mute }}>Nothing yet. You're told when your requests move and when you can buy.</Text>
        ) : null}

        <View className="gap-sm">
          {items.map((n) => {
            const at = parseLocalDateTime(n.createdAt);
            return (
              <Pressable key={n.id} onPress={() => markOne(n)} accessibilityRole="button" accessibilityHint={n.read ? undefined : 'Marks this notification read'}>
                <Card>
                  <View className="flex-row items-center" style={{ gap: 8 }}>
                    {!n.read ? <View style={{ width: 8, height: 8, borderRadius: radius.sm, backgroundColor: color.info }} /> : null}
                    <Text style={{ ...textStyle(typeScale.chip), color: n.read ? color.mute : color.info, flex: 1 }}>
                      {TYPE_LABEL[n.type] ?? n.type}
                    </Text>
                    <Text style={{ ...textStyle(typeScale.value), fontSize: 12, color: color.mute }}>
                      {at ? `${formatDayLabel(at)} ${formatTime(at)}` : ''}
                    </Text>
                  </View>
                  <Text style={{ ...textStyle(typeScale.cardTitle), color: n.read ? color.steel : color.ink, marginTop: 6 }}>{n.title}</Text>
                  <Text style={{ ...textStyle(typeScale.body), color: n.read ? color.mute : color.steel, marginTop: 2 }}>{n.message}</Text>
                </Card>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
