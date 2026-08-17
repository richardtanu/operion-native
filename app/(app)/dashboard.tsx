import { Link } from 'expo-router';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Callout } from '../../components';
import { useAuth } from '../../auth/AuthContext';

// Scaffolding proof, not a designed screen — module 3 (outlet operator /
// scan loop) hasn't been through the plan's screen-inventory-and-gates
// process yet (plan.md §5, §6), so there's nothing real to build here. This
// exists to confirm the auth-gated route group and NativeWind styling work.
export default function DashboardScreen() {
  const { logout } = useAuth();

  return (
    <SafeAreaView className="flex-1 bg-neutral-0">
      <View className="flex-1 gap-lg px-xl pt-xl">
        <Text className="text-2xl font-bold text-neutral-900">Dashboard</Text>

        <Callout title="Placeholder">
          This is scaffolding, not a designed screen. Real outlet-operator / scan-loop screens
          land here once module 3 goes through the plan's screen-inventory process.
        </Callout>

        <Link href="/(app)/debug-outbox" asChild>
          <Button label="Open outbox debug screen" variant="secondary" />
        </Link>

        <Button label="Log out" variant="secondary" onPress={logout} />
      </View>
    </SafeAreaView>
  );
}
