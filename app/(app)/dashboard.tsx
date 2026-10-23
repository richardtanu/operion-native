import { useCallback, useState } from 'react';
import { Link, useFocusEffect, useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Callout, Section } from '../../components';
import { useAuth } from '../../auth/AuthContext';
import { getUnreadCount } from '../../api/notifications';
import { getInventoryDashboard } from '../../api/inventory';
import { getTenantTree } from '../../api/tenants';
import type { InventoryDashboardResponse } from '../../api/types';
import { countStaleDrafts, STALE_DRAFT_DAYS } from '../../drafts/realisasiDrafts';
import { useTheme } from '../../theme/ThemeContext';
import { textStyle } from '../../theme/typeStyle';


// Mostly scaffolding — module 3 (outlet operator / scan loop) hasn't been
// through the plan's screen-inventory-and-gates process yet. The stock tiles
// are INV-08 (module 2): each opens Stock with that filter. HQ doesn't get
// them — summed across stores they'd mean nothing; HQ's view is stock across
// stores, which waits for BE-26.
export default function DashboardScreen() {
  const { color, type: typeScale, radius, border } = useTheme();
  const router = useRouter();
  const { logout, token, user } = useAuth();
  const [unread, setUnread] = useState<number | null>(null);
  const [staleDrafts, setStaleDrafts] = useState(0);
  const [store, setStore] = useState<{ name: string; atHq: boolean } | null>(null);
  const [stock, setStock] = useState<InventoryDashboardResponse | null>(null);

  // Refresh whenever the dashboard comes back into view, e.g. after reading
  // notifications or finishing a draft. A failed count just hides the number.
  useFocusEffect(
    useCallback(() => {
      if (token) {
        getUnreadCount(token)
          .then((r) => setUnread(r.unreadCount))
          .catch(() => setUnread(null));
        getTenantTree(token)
          .then((tree) => {
            const atHq = !!tree[0] && tree[0].parentId == null;
            setStore(tree[0] ? { name: tree[0].name, atHq } : null);
            if (!atHq) return getInventoryDashboard(token).then(setStock);
            setStock(null);
          })
          .catch(() => setStock(null));
      }
      if (user) {
        countStaleDrafts(user.id)
          .then(setStaleDrafts)
          .catch(() => setStaleDrafts(0));
      }
    }, [token, user]),
  );

  const tile = (label: string, value: number, tone?: string, filter?: 'low' | 'out') => (
    <Pressable
      key={label}
      onPress={() => router.push({ pathname: '/(app)/inventory/stock', params: filter ? { filter } : {} })}
      style={{ flexBasis: '47%', flexGrow: 1, padding: 10, gap: 2, backgroundColor: color.panel, borderColor: color.line, borderWidth: border.base, borderRadius: radius.sm }}
    >
      <Text style={{ ...textStyle(typeScale.fieldLabel), color: color.mute }}>{label}</Text>
      <Text style={{ ...textStyle(typeScale.valueLarge), color: tone ?? color.ink }}>{value.toLocaleString('en-US')}</Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.surface }}>
      <ScrollView contentContainerClassName="gap-lg px-xl pt-xl pb-xl">
        <Text style={{ ...textStyle(typeScale.heading), color: color.ink }}>Dashboard</Text>

        {stock && store ? (
          <View className="gap-sm">
            <Section>{`Stock · ${store.name}`}</Section>
            <View className="flex-row flex-wrap" style={{ gap: 8 }}>
              {tile('Items', stock.totalParts)}
              {tile('Low', stock.lowStock, stock.lowStock ? color.warn : undefined, 'low')}
              {tile('Out', stock.outOfStock, stock.outOfStock ? color.danger : undefined, 'out')}
              {tile('Used today', stock.stockUsedToday)}
              {tile('Received today', stock.stockReceivedToday)}
              {tile('Total stock', stock.totalStock)}
            </View>
          </View>
        ) : null}

        {/* A draft is a purchase that already happened: the money is spent, but
            the Owner can't see it until it's created. Nudge after 3 days. */}
        {staleDrafts > 0 ? (
          <View className="gap-sm">
            <Callout tone="warning" title="Unfinished purchases">
              {`${staleDrafts} ${staleDrafts === 1 ? 'purchase was' : 'purchases were'} saved as a draft more than ${STALE_DRAFT_DAYS} days ago. The money is already spent, but the Owner can't see it until you create ${staleDrafts === 1 ? 'it' : 'them'}.`}
            </Callout>
            <Link href="/(app)/realisasi/create" asChild>
              <Button label="Open drafts" variant="secondary" />
            </Link>
          </View>
        ) : null}

        <Link href="/(app)/inventory" asChild>
          <Button label="Inventory" />
        </Link>

        <Link href="/(app)/procurement" asChild>
          <Button label="Procurement" variant="secondary" />
        </Link>

        <Link href="/(app)/notifications" asChild>
          <Button label={unread ? `Notifications · ${unread} unread` : 'Notifications'} variant="secondary" />
        </Link>

        {__DEV__ ? (
          <Link href="/(app)/debug-outbox" asChild>
            <Button label="Open outbox debug screen" variant="secondary" />
          </Link>
        ) : null}

        <Button label="Log out" variant="secondary" onPress={logout} />
      </ScrollView>
    </SafeAreaView>
  );
}
