import { Link, type Href } from 'expo-router';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../../components';
import { useTheme } from '../../../theme/ThemeContext';
import { textStyle } from '../../../theme/typeStyle';


const SCREENS: { code: string; label: string; href: Href }[] = [
  { code: 'PROC-01', label: 'New purchase request', href: '/(app)/purchase-requests/create' },
  { code: 'PROC-02', label: 'Requests', href: '/(app)/purchase-requests' },
  { code: 'PROC-03', label: 'New authorization', href: '/(app)/purchase-authorizations/create' },
  { code: 'PROC-04', label: 'New realisasi', href: '/(app)/realisasi/create' },
  { code: 'PROC-05', label: 'Goods receipts', href: '/(app)/goods-receipts' },
  { code: 'PROC-06', label: 'Suppliers', href: '/(app)/suppliers' },
  { code: 'PROC-07', label: 'New purchase order', href: '/(app)/purchase-orders/create' },
  { code: 'PROC-08', label: 'Reimbursements', href: '/(app)/reimbursements' },
];

// Module 1 (Procurement) menu — entry point into PROC-01…08. Dashboard is
// still scaffolding (module 3 hasn't gone through the screen-inventory
// process), so this menu is the real navigation home for the one module
// that has.
export default function ProcurementMenuScreen() {
  const { color, type: typeScale } = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.surface }}>
      <View className="flex-1 gap-md px-xl pt-xl">
        <Text style={{ ...textStyle(typeScale.heading), color: color.ink }}>Procurement</Text>
        <View className="gap-sm">
          {SCREENS.map((s) => (
            <Link key={s.code} href={s.href} asChild>
              <Button label={`${s.code} · ${s.label}`} variant="secondary" />
            </Link>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}
