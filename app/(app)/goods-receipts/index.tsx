import { useCallback, useEffect, useState } from 'react';
import { Link } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Callout, Card, Chip, KV } from '../../../components';
import { useAuth } from '../../../auth/AuthContext';
import { listGoodsReceipts } from '../../../api/procurement';
import { ApiError } from '../../../api/httpError';
import type { GoodsReceiptPath, GoodsReceiptResponse } from '../../../api/types';
import { useTheme } from '../../../theme/ThemeContext';
import { textStyle } from '../../../theme/typeStyle';


type PathFilter = GoodsReceiptPath | 'ALL';
const FILTERS: { value: PathFilter; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'REALISASI', label: 'By realisasi' },
  { value: 'PO', label: 'By purchase order' },
];

// PROC-05 — Goods Receipt list (BE-08). The caller's tenant tree, newest
// receivedDate first. The path filter is applied server-side, so this list
// stays correct as it grows — unlike PROC-08's device-side filter.
export default function GoodsReceiptListScreen() {
  const { color, type: typeScale } = useTheme();
  const { token } = useAuth();
  const [filter, setFilter] = useState<PathFilter>('ALL');
  const [selfOnly, setSelfOnly] = useState(false);
  const [items, setItems] = useState<GoodsReceiptResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      setItems(
        await listGoodsReceipts({ path: filter === 'ALL' ? undefined : filter, selfReceived: selfOnly ? true : undefined }, token),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load goods receipts.');
    } finally {
      setLoading(false);
    }
  }, [filter, selfOnly, token]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.surface }}>
      <ScrollView contentContainerClassName="gap-md px-xl pt-xl pb-xl">
        <Text style={{ ...textStyle(typeScale.screenTitle), color: color.ink }}>Goods Receipts</Text>

        <Link href="/(app)/goods-receipts/create" asChild>
          <Button label="Receive goods" />
        </Link>

        <View className="flex-row flex-wrap" style={{ gap: 6 }}>
          {FILTERS.map((f) => (
            <Button
              key={f.value}
              label={f.label}
              variant={filter === f.value ? 'primary' : 'secondary'}
              onPress={() => setFilter(f.value)}
              style={{ width: 'auto', paddingHorizontal: 10, paddingVertical: 6 }}
            />
          ))}
          <Button
            label="Self-received"
            variant={selfOnly ? 'primary' : 'secondary'}
            onPress={() => setSelfOnly((v) => !v)}
            style={{ width: 'auto', paddingHorizontal: 10, paddingVertical: 6 }}
          />
        </View>

        {error ? <Callout tone="danger">{error}</Callout> : null}
        {loading ? <Text style={{ ...textStyle(typeScale.body), color: color.steel }}>Loading…</Text> : null}
        {!loading && !error && items.length === 0 ? (
          <Text style={{ ...textStyle(typeScale.body), color: color.mute }}>No goods receipts yet.</Text>
        ) : null}

        <View className="gap-sm">
          {items.map((gr) => (
            <Card key={gr.id}>
              <View className="flex-row items-baseline justify-between" style={{ gap: 10 }}>
                <Text style={{ ...textStyle(typeScale.value), color: color.ink, flex: 1 }}>
                  {gr.purchaseOrderId ? gr.poNumber ?? gr.purchaseOrderId : gr.externalOrderRef ?? gr.realisasiId}
                </Text>
                <View className="flex-row" style={{ gap: 6 }}>
                  {gr.selfReceived ? <Chip label="Self-received" tone="warning" /> : null}
                  <Chip label={gr.purchaseOrderId ? 'PO' : 'Realisasi'} tone="neutral" />
                </View>
              </View>
              <Text style={{ ...textStyle(typeScale.helper), color: color.steel, marginTop: 2 }}>
                received {new Date(gr.receivedDate).toLocaleDateString()} by {gr.receivedByName}
              </Text>
              <View style={{ marginTop: 8 }}>
                {gr.items.map((item) => (
                  <KV key={item.id} k={item.partName} v={`${item.quantity} (stock units)`} />
                ))}
              </View>
              {gr.notes ? <Text style={{ ...textStyle(typeScale.helper), color: color.mute, marginTop: 6 }}>{gr.notes}</Text> : null}
            </Card>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
