import { useCallback, useState } from 'react';
import { Link, useFocusEffect } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Callout } from '../../../components';
import { useAuth } from '../../../auth/AuthContext';
import { listPendingStockAdjustments } from '../../../api/inventory';
import { getTenantTree } from '../../../api/tenants';
import { useTheme } from '../../../theme/ThemeContext';
import { textStyle } from '../../../theme/typeStyle';


// Module 2 (Inventory) menu — the store's entry into INV-01, 02, 04 and 06
// (Gate 1 found the app had none). HQ's own screens — stock across stores,
// the catalog, categories — wait for BE-26…BE-29; until then an HQ caller
// would see every store's rows mixed together, so it's told so here.
export default function InventoryMenuScreen() {
  const { color, type: typeScale } = useTheme();
  const { token } = useAuth();
  const [waiting, setWaiting] = useState<number | null>(null);
  const [atHq, setAtHq] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!token) return;
      listPendingStockAdjustments(token)
        .then((list) => setWaiting(list.length))
        .catch(() => setWaiting(null));
      getTenantTree(token)
        .then((tree) => setAtHq(!!tree[0] && tree[0].parentId == null))
        .catch(() => setAtHq(false));
    }, [token]),
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.surface }}>
      <ScrollView contentContainerClassName="gap-md px-xl pt-xl pb-xl">
        <Text style={{ ...textStyle(typeScale.heading), color: color.ink }}>Inventory</Text>
        {atHq ? (
          <Callout tone="warning" title="Store screens">
            These lists show every store's items together, with no store on each row yet. HQ's own view (stock across
            stores) comes later.
          </Callout>
        ) : null}
        <View className="gap-sm">
          <Link href="/(app)/inventory/stock" asChild>
            <Button label="Stock" variant="secondary" />
          </Link>
          <Link href="/(app)/inventory/restock" asChild>
            <Button label="Restock" variant="secondary" />
          </Link>
          <Link href="/(app)/inventory/adjustments" asChild>
            <Button label={waiting ? `Adjustments · ${waiting} waiting` : 'Adjustments'} variant="secondary" />
          </Link>
          <Link href="/(app)/inventory/items" asChild>
            <Button label="Items" variant="secondary" />
          </Link>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
