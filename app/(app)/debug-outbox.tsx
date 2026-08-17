import { FlatList, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Callout, SyncStateIndicator, type SyncState } from '../../components';
import { useOutbox } from '../../outbox/OutboxProvider';
import type { OutboxItem, OutboxStatus } from '../../outbox/types';

// Dev-only verification screen — not part of any designed flow. Exists so
// the outbox (plan.md §1) can be exercised end-to-end without a real write
// screen: enqueue a fake item, watch it go queued -> confirmed/failed, and
// confirm a kill-and-relaunch mid-queue doesn't lose the row (see the plan's
// verification checklist). Exclude from production nav / gate behind
// __DEV__ once real write screens exist.
export default function DebugOutboxScreen() {
  const { items, enqueue, retryItem } = useOutbox();

  return (
    <SafeAreaView className="flex-1 bg-neutral-0">
      <View className="flex-1 gap-lg px-xl pt-xl">
        <Text className="text-2xl font-bold text-neutral-900">Outbox debug</Text>

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
          ListEmptyComponent={<Text className="text-sm text-neutral-500">No outbox items yet.</Text>}
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
  return (
    <View className="flex-row items-center justify-between rounded-md border border-neutral-200 px-md py-md">
      <View className="flex-1 gap-xs">
        <Text className="text-sm font-medium text-neutral-800">{item.kind}</Text>
        <Text className="text-xs text-neutral-500">{item.endpoint}</Text>
        {item.lastError ? <Text className="text-xs text-status-danger">{item.lastError}</Text> : null}
      </View>
      <SyncStateIndicator state={toSyncState(item.status)} onRetry={onRetry} />
    </View>
  );
}
