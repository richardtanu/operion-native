import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { Store } from 'lucide-react-native';
import { BellButton, Button, Callout, Card, KV, MenuGrid, Screen, Section, StatCard, type MenuTileItem } from '../../../components';
import { useAuth } from '../../../auth/AuthContext';
import { canReadSpending } from '../../../auth/permissions';
import { getInventoryDashboard } from '../../../api/inventory';
import { getSpending } from '../../../api/procurement';
import type { InventoryDashboardResponse, StoreSpendingResponse } from '../../../api/types';
import { countStaleDrafts, STALE_DRAFT_DAYS } from '../../../drafts/realisasiDrafts';
import { toIsoDate } from '../../../lib/dates';
import { inventoryMenu, procurementMenu } from '../../../lib/menu';
import { rp } from '../../../lib/money';
import { useStoreInfo } from '../../../lib/useStoreInfo';
import { useTheme } from '../../../theme/ThemeContext';
import { textStyle } from '../../../theme/typeStyle';

const n = (v: number) => v.toLocaleString('id-ID');

// Home tab: the store at a glance. A store sees its stock (INV-08) and, for
// Owner+ and Accounting, this month's spending (BE-16); HQ gets spending and
// its own shortcuts, not stock: the dashboard endpoint sums every store,
// which means nothing, and HQ's view is Stock across stores.
export default function HomeScreen() {
  const { color, font, type: typeScale, radius, border } = useTheme();
  const router = useRouter();
  const { token, user } = useAuth();
  const store = useStoreInfo();
  const [stock, setStock] = useState<InventoryDashboardResponse | null>(null);
  const [spending, setSpending] = useState<StoreSpendingResponse | null>(null);
  const [staleDrafts, setStaleDrafts] = useState(0);
  const seesMoney = canReadSpending(user);
  const atHq = !!store?.atHq;

  // Refresh whenever Home comes back into view, e.g. after finishing a draft.
  useFocusEffect(
    useCallback(() => {
      if (!token || !store) return;
      if (!store.atHq) {
        getInventoryDashboard(token)
          .then(setStock)
          .catch(() => setStock(null));
      }
      if (seesMoney) {
        getSpending(toIsoDate(new Date()).slice(0, 7), token)
          .then((rows) => setSpending(rows[0] ?? null))
          .catch(() => setSpending(null));
      }
      if (user) {
        countStaleDrafts(user.id)
          .then(setStaleDrafts)
          .catch(() => setStaleDrafts(0));
      }
    }, [token, store, seesMoney, user]),
  );

  const openStock = (filter?: 'low' | 'out') => router.push({ pathname: '/(app)/inventory/stock', params: filter ? { filter } : {} });

  const all = [...procurementMenu(user), ...inventoryMenu(atHq)];
  const shortcutKeys = atHq ? ['requests', 'across', 'catalog'] : ['buy', 'receipts', 'restock'];
  const shortcuts: MenuTileItem[] = shortcutKeys
    .map((k) => all.find((e) => e.key === k))
    .filter((e) => !!e)
    .map((e) => ({ ...e, onPress: () => router.push(e.href) }));

  const storeBanner = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        borderRadius: radius.lg,
        borderWidth: border.hair,
        borderColor: color.line,
        backgroundColor: color.panel,
        paddingVertical: 14,
        paddingHorizontal: 16,
      }}
    >
      <Store size={26} color={color.ink} strokeWidth={1.75} />
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={{ ...textStyle(typeScale.cardTitle), color: color.ink }}>
          {store?.name ?? user?.tenantName ?? ' '}
        </Text>
        <Text style={{ ...textStyle(typeScale.helper), color: color.steel }}>{store ? (store.atHq ? 'HQ · every store' : store.code) : ' '}</Text>
      </View>
    </View>
  );

  const left = spending && spending.budget != null ? spending.budget - spending.spent - spending.committed - spending.otherExpenses : null;

  return (
    <Screen title="Operion" leading="menu" trailing={<BellButton />} header={storeBanner}>
      {user ? (
        <Text style={{ ...textStyle(typeScale.body), color: color.steel }}>
          Hello, <Text style={{ fontFamily: font.bodyBold, color: color.ink }}>{user.fullName.split(' ')[0]}</Text>
        </Text>
      ) : null}

      {/* A draft is a purchase that already happened: the money is spent, but
          the Owner can't see it until it's created. Nudge after 3 days. */}
      {staleDrafts > 0 ? (
        <View style={{ gap: 8 }}>
          <Callout tone="warning" title="Unfinished purchases">
            {`${staleDrafts} ${staleDrafts === 1 ? 'purchase was' : 'purchases were'} saved as a draft more than ${STALE_DRAFT_DAYS} days ago. The money is already spent, but the Owner can't see it until you create ${staleDrafts === 1 ? 'it' : 'them'}.`}
          </Callout>
          <Button label="Open drafts" variant="secondary" onPress={() => router.push('/(app)/realisasi/create')} />
        </View>
      ) : null}

      {stock ? (
        <>
          <Section>Stock today</Section>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            <StatCard label="Low stock" value={n(stock.lowStock)} valueColor={stock.lowStock ? color.warn : undefined} sub="tap to see them" onPress={() => openStock('low')} />
            <StatCard label="Out of stock" value={n(stock.outOfStock)} valueColor={stock.outOfStock ? color.danger : undefined} sub="tap to see them" onPress={() => openStock('out')} />
          </View>
          <Card>
            <KV k="Items" v={n(stock.totalParts)} />
            <KV k="Total in stock" v={n(stock.totalStock)} />
            <KV k="Used today" v={n(stock.stockUsedToday)} />
            <KV k="Received today" v={n(stock.stockReceivedToday)} />
          </Card>
        </>
      ) : null}

      {spending ? (
        <>
          <Section>{`This month · ${spending.tenantName}`}</Section>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            <StatCard label="Spent" value={rp(spending.spent)} sub={spending.otherExpenses ? `+ ${rp(spending.otherExpenses)} expenses` : undefined} />
            <StatCard
              label={left != null ? 'Budget left' : 'Committed'}
              value={left != null ? rp(left) : rp(spending.committed)}
              valueColor={spending.overBudget ? color.warn : undefined}
              sub={left != null ? `of ${rp(spending.budget)}` : 'approved, not yet spent'}
            />
          </View>
          <Button label="See all reports" variant="secondary" onPress={() => router.push('/(app)/(tabs)/reports')} />
        </>
      ) : null}

      <Section>Shortcuts</Section>
      <MenuGrid items={shortcuts} />
    </Screen>
  );
}
