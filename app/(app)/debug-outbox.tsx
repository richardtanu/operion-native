import { Redirect } from 'expo-router';
import { FlatList, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Callout, SyncStateIndicator, type SyncState } from '../../components';
import { useOutbox } from '../../outbox/OutboxProvider';
import type { OutboxItem, OutboxStatus } from '../../outbox/types';
import { useTheme } from '../../theme/ThemeContext';
import { textStyle } from '../../theme/typeStyle';


// Dev-only verification screen — not part of any designed flow. Exists so
// the outbox can be exercised end-to-end without a real write screen:
// enqueue a fake item, watch it go queued -> confirmed/failed, and confirm
// a kill-and-relaunch mid-queue doesn't lose the row.
//
// Never reachable in a production build: the dashboard hides its link
// behind __DEV__, and a deep link to this route redirects away.
export default function DebugOutboxRoute() {
  if (!__DEV__) return <Redirect href="/(app)/dashboard" />;
  return <DebugOutboxScreen />;
}

function DebugOutboxScreen() {
  const { color, type: typeScale, radius, border } = useTheme();
  const { items, enqueue, retryItem } = useOutbox();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.surface }}>
      <View className="flex-1 gap-lg px-xl pt-xl">
        <Text style={{ ...textStyle(typeScale.heading), color: color.ink }}>Outbox debug</Text>

        <Callout title="What this proves">
          Enqueue writes below, then background/kill and relaunch the app before they resolve —
          the row should still be here on relaunch. That durability guarantee is the entire
          reason this layer exists.
        </Callout>

        <View className="flex-row gap-sm">
          <View className="flex-1">
            <Button
              label="Enqueue (likely succeeds)"
              variant="secondary"
              onPress={() =>
                enqueue({ kind: 'debug.ping', endpoint: '/debug/ping', method: 'POST', payload: { ts: Date.now() } })
              }
            />
          </View>
          <View className="flex-1">
            <Button
              label="Enqueue (likely fails)"
              variant="secondary"
              onPress={() =>
                enqueue({
                  kind: 'debug.ping-bad',
                  endpoint: '/debug/this-endpoint-does-not-exist',
                  method: 'POST',
                  payload: { ts: Date.now() },
                })
              }
            />
          </View>
        </View>

        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerClassName="gap-sm pb-xl"
          renderItem={({ item }) => <OutboxRow item={item} onRetry={() => retryItem(item.id)} />}
          ListEmptyComponent={<Text style={{ ...textStyle(typeScale.body), color: color.steel }}>No outbox items yet.</Text>}
        />
      </View>
    </SafeAreaView>
  );
}

function toSyncState(status: OutboxStatus): SyncState {
  if (status === 'confirmed') return 'confirmed';
  if (status === 'failed') return 'failed';
  return 'queued'; // collapses pending/sending, same as useOutboxAction
}

function OutboxRow({ item, onRetry }: { item: OutboxItem; onRetry: () => void }) {
  const { color, type: typeScale, radius, border } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: radius.sm,
        borderWidth: border.hair,
        borderColor: color.hair,
        paddingHorizontal: 12,
        paddingVertical: 12,
        backgroundColor: color.panel,
      }}
    >
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={{ ...textStyle(typeScale.body), color: color.ink }}>{item.kind}</Text>
        <Text style={{ ...textStyle(typeScale.helper), color: color.steel }}>{item.endpoint}</Text>
        {item.lastError ? <Text style={{ ...textStyle(typeScale.helper), color: color.danger }}>{item.lastError}</Text> : null}
      </View>
      <SyncStateIndicator state={toSyncState(item.status)} onRetry={onRetry} />
    </View>
  );
}
