import { useCallback, useState } from 'react';
import { Link, useFocusEffect } from 'expo-router';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Callout } from '../../components';
import { useAuth } from '../../auth/AuthContext';
import { getUnreadCount } from '../../api/notifications';
import { countStaleDrafts, STALE_DRAFT_DAYS } from '../../drafts/realisasiDrafts';
import { useTheme } from '../../theme/ThemeContext';
import { textStyle } from '../../theme/typeStyle';


// Scaffolding proof, not a designed screen — module 3 (outlet operator /
// scan loop) hasn't been through the plan's screen-inventory-and-gates
// process yet, so there's nothing real to build here beyond an entry point
// into Procurement (module 1, the one module that has gone through it).
export default function DashboardScreen() {
  const { color, type: typeScale } = useTheme();
  const { logout, token, user } = useAuth();
  const [unread, setUnread] = useState<number | null>(null);
  const [staleDrafts, setStaleDrafts] = useState(0);

  // Refresh whenever the dashboard comes back into view, e.g. after reading
  // notifications or finishing a draft. A failed count just hides the number.
  useFocusEffect(
    useCallback(() => {
      if (token) {
        getUnreadCount(token)
          .then((r) => setUnread(r.unreadCount))
          .catch(() => setUnread(null));
      }
      if (user) {
        countStaleDrafts(user.id)
          .then(setStaleDrafts)
          .catch(() => setStaleDrafts(0));
      }
    }, [token, user]),
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.surface }}>
      <View className="flex-1 gap-lg px-xl pt-xl">
        <Text style={{ ...textStyle(typeScale.heading), color: color.ink }}>Dashboard</Text>

        <Callout title="Placeholder">
          This is scaffolding, not a designed screen. Real outlet-operator / scan-loop screens
          land here once module 3 goes through the plan's screen-inventory process.
        </Callout>

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

        <Link href="/(app)/procurement" asChild>
          <Button label="Procurement" />
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
      </View>
    </SafeAreaView>
  );
}
