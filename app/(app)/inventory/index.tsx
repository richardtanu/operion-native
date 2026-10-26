import { useCallback, useState } from 'react';
import { Link, useFocusEffect } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Section } from '../../../components';
import { useAuth } from '../../../auth/AuthContext';
import { listPendingStockAdjustments } from '../../../api/inventory';
import { getTenantTree } from '../../../api/tenants';
import { useTheme } from '../../../theme/ThemeContext';
import { textStyle } from '../../../theme/typeStyle';


// Module 2 (Inventory) menu — the store's entry into INV-01, 02, 04 and 06
// (Gate 1 found the app had none). Signed in at HQ, it also opens HQ's own
// screens: stock across stores (INV-03) and the catalog (INV-09). Categories
// (INV-07) wait for BE-29's single list.
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
          <View className="gap-sm">
            <Section>HQ</Section>
            <Link href="/(app)/inventory/across" asChild>
              <Button label="Stock across stores" />
            </Link>
            <Link href="/(app)/inventory/catalog" asChild>
              <Button label="HQ catalog" variant="secondary" />
            </Link>
            <Section>Every store's lists</Section>
          </View>
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
