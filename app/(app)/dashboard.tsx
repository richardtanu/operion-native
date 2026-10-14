import { Link } from 'expo-router';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Callout } from '../../components';
import { useAuth } from '../../auth/AuthContext';
import { useTheme } from '../../theme/ThemeContext';
import { textStyle } from '../../theme/typeStyle';


// Scaffolding proof, not a designed screen — module 3 (outlet operator /
// scan loop) hasn't been through the plan's screen-inventory-and-gates
// process yet, so there's nothing real to build here beyond an entry point
// into Procurement (module 1, the one module that has gone through it).
export default function DashboardScreen() {
  const { color, type: typeScale } = useTheme();
  const { logout } = useAuth();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.surface }}>
      <View className="flex-1 gap-lg px-xl pt-xl">
        <Text style={{ ...textStyle(typeScale.heading), color: color.ink }}>Dashboard</Text>

        <Callout title="Placeholder">
          This is scaffolding, not a designed screen. Real outlet-operator / scan-loop screens
          land here once module 3 goes through the plan's screen-inventory process.
        </Callout>

        <Link href="/(app)/procurement" asChild>
          <Button label="Procurement" />
        </Link>

        <Link href="/(app)/debug-outbox" asChild>
          <Button label="Open outbox debug screen" variant="secondary" />
        </Link>

        <Button label="Log out" variant="secondary" onPress={logout} />
      </View>
    </SafeAreaView>
  );
}
