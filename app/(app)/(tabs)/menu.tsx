import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { View } from 'react-native';
import { BellButton, MenuGrid, Screen, Section, type MenuTileItem } from '../../../components';
import { useAuth } from '../../../auth/AuthContext';
import { listPendingStockAdjustments } from '../../../api/inventory';
import { inventoryMenu, procurementMenu, type MenuEntry } from '../../../lib/menu';
import { useStoreInfo } from '../../../lib/useStoreInfo';
import { useTheme } from '../../../theme/ThemeContext';

// Menu tab: every procurement and inventory screen as an icon grid. Tiles a
// role can't use stay, locked; Adjustments shows how many wait for a decision.
export default function MenuScreen() {
  const { color, radius, border } = useTheme();
  const router = useRouter();
  const { token, user } = useAuth();
  const store = useStoreInfo();
  const [waiting, setWaiting] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!token) return;
      listPendingStockAdjustments(token)
        .then((list) => setWaiting(list.length))
        .catch(() => setWaiting(null));
    }, [token]),
  );

  const tiles = (entries: MenuEntry[]): MenuTileItem[] =>
    entries.map((e) => ({ ...e, badge: e.key === 'adjustments' ? waiting : undefined, onPress: () => router.push(e.href) }));

  const group = (title: string, entries: MenuEntry[], accent: string) => (
    <View style={{ gap: 14 }}>
      <Section>{title}</Section>
      <View style={{ backgroundColor: color.panel, borderRadius: radius.lg, borderWidth: border.hair, borderColor: color.hair, paddingVertical: 20, paddingHorizontal: 4 }}>
        <MenuGrid items={tiles(entries)} accent={accent} />
      </View>
    </View>
  );

  return (
    <Screen title="Menu" leading="menu" trailing={<BellButton />}>
      {group('Procurement', procurementMenu(user), color.ink)}
      {group('Inventory', inventoryMenu(!!store?.atHq), color.info)}
    </Screen>
  );
}
