import { Link, type Href } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../../components';
import { useAuth } from '../../../auth/AuthContext';
import { canReadActivityLog } from '../../../auth/permissions';
import { useTheme } from '../../../theme/ThemeContext';
import { textStyle } from '../../../theme/typeStyle';


const SCREENS: { code: string; label: string; href: Href }[] = [
  { code: 'PROC-01', label: 'New purchase request', href: '/(app)/purchase-requests/create' },
  { code: 'PROC-02', label: 'Requests', href: '/(app)/purchase-requests' },
  { code: 'PROC-03', label: 'Spending limits', href: '/(app)/purchase-authorizations/create' },
  { code: 'PROC-04', label: 'Buy elsewhere', href: '/(app)/realisasi/create' },
  { code: 'PROC-05', label: 'Goods receipts', href: '/(app)/goods-receipts' },
  { code: 'PROC-06', label: 'Suppliers', href: '/(app)/suppliers' },
  { code: 'PROC-07', label: 'Order from HQ', href: '/(app)/purchase-orders/create' },
  { code: 'PROC-08', label: 'Reimbursements', href: '/(app)/reimbursements' },
  { code: 'PROC-10', label: 'Expenses', href: '/(app)/expenses' },
];

// Module 1 (Procurement) menu — entry point into PROC-01…08 and PROC-10. Dashboard is
// still scaffolding (module 3 hasn't gone through the screen-inventory
// process), so this menu is the real navigation home for the one module
// that has.
export default function ProcurementMenuScreen() {
  const { color, type: typeScale } = useTheme();
  const { user } = useAuth();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.surface }}>
      <ScrollView contentContainerClassName="gap-md px-xl pt-xl pb-xl">
        <Text style={{ ...textStyle(typeScale.heading), color: color.ink }}>Procurement</Text>
        <View className="gap-sm">
          {SCREENS.map((s) => (
            <Link key={s.code} href={s.href} asChild>
              <Button label={`${s.code} · ${s.label}`} variant="secondary" />
            </Link>
          ))}
          {/* Gated: ADMIN or PROCUREMENT role, or Owner scope and above. Shown to
              everyone so the gate is visible, disabled for those it excludes. */}
          <Link href="/(app)/procurement/activity" asChild>
            <Button label="PROC-09 · Activity log" variant="gated" gate="ADMIN·PROC·OWNER+" disabled={!canReadActivityLog(user)} />
          </Link>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
