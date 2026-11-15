import { useRouter } from 'expo-router';
import { ChartPie, History, Wallet } from 'lucide-react-native';
import { BellButton, ListGroup, ListRow, Screen, Section, SpendingSummary } from '../../../components';
import { useAuth } from '../../../auth/AuthContext';
import { canReadActivityLog, canReadCashflow, canReadSpending, canSetBudget } from '../../../auth/permissions';
import { useTheme } from '../../../theme/ThemeContext';

// Reports tab: the money and the record of who did what. The spending
// summary (BE-16) for Owner+ and Accounting, then Cashflow (BE-41) and the
// Activity log (PROC-09). Rows a role can't open stay, locked.
export default function ReportsScreen() {
  const { color } = useTheme();
  const router = useRouter();
  const { token, user } = useAuth();
  const seesSpending = canReadSpending(user);

  return (
    <Screen title="Reports" leading="menu" trailing={<BellButton />}>
      <Section>Reports</Section>
      <ListGroup>
        <ListRow
          Icon={Wallet}
          title="Cashflow"
          subtitle="Money out, day by day"
          onPress={() => router.push('/(app)/procurement/cashflow')}
          lockedFor={canReadCashflow(user) ? undefined : "Accounting or the store's Owner"}
        />
        <ListRow
          Icon={History}
          title="Activity log"
          subtitle="Who did what in procurement"
          tint={color.info}
          onPress={() => router.push('/(app)/procurement/activity')}
          lockedFor={canReadActivityLog(user) ? undefined : "an Admin, Procurement, Accounting or the store's Owner"}
        />
        {seesSpending ? null : <ListRow Icon={ChartPie} title="This month's spending" lockedFor="Accounting or the store's Owner" />}
      </ListGroup>

      {token && seesSpending ? (
        <>
          <Section>Spending this month</Section>
          <SpendingSummary token={token} canSetBudget={canSetBudget(user)} />
        </>
      ) : null}
    </Screen>
  );
}
