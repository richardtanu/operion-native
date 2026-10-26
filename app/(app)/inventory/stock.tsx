import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Callout, Card, Chip, Row } from '../../../components';
import { useAuth } from '../../../auth/AuthContext';
import { canCreatePurchaseRequest, canDraftOrder } from '../../../auth/permissions';
import { useTheme } from '../../../theme/ThemeContext';
import { textStyle } from '../../../theme/typeStyle';
import { coverLabel, encodeLines, lowReasonLabel, worstFirst, type StockLine } from '../../../lib/stockLevel';
import { useStockLines } from '../../../lib/useStockLines';


type Filter = 'ALL' | 'LOW' | 'OUT';

// INV-01 — Stock. Everything the store holds, how much is left and what's
// running low, by the one "low" rule (lib/stockLevel). A low item opens a
// request with the amount filled in — or, for an item that must be bought
// from HQ, an order from HQ. Opened from the dashboard tiles with
// `filter=low|out`.
export default function StockScreen() {
  const { color, type: typeScale } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ filter?: string }>();
  const { user, token } = useAuth();
  const [filter, setFilter] = useState<Filter>(params.filter === 'low' ? 'LOW' : params.filter === 'out' ? 'OUT' : 'ALL');
  const { lines, loading, error } = useStockLines(token);

  const low = lines.filter((l) => l.lowBecause != null);
  const out = lines.filter((l) => l.lowBecause === 'OUT');
  const shown = (filter === 'ALL' ? lines : filter === 'LOW' ? low : out).slice().sort(worstFirst);

  // Items that must be bought from HQ are ordered from HQ; everything else is requested.
  const mustOrderFromHq = (l: StockLine) => !!(l.part?.mandatoryFromHq && l.part.catalogPartId);

  const restock = (l: StockLine) => {
    const fromHq = mustOrderFromHq(l);
    router.push({
      pathname: fromHq ? '/(app)/purchase-orders/create' : '/(app)/purchase-requests/create',
      params: { lines: encodeLines([{ partId: fromHq ? l.part!.catalogPartId! : l.partId, quantity: l.suggestedQty }]) },
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.surface }}>
      <ScrollView contentContainerClassName="gap-md px-xl pt-xl pb-xl">
        <Text style={{ ...textStyle(typeScale.screenTitle), color: color.ink }}>Stock</Text>

        <View className="flex-row flex-wrap" style={{ gap: 6 }}>
          {(
            [
              ['ALL', 'All'],
              ['LOW', `Low · ${low.length}`],
              ['OUT', `Out · ${out.length}`],
            ] as [Filter, string][]
          ).map(([id, label]) => (
            <Button
              key={id}
              label={label}
              variant={filter === id ? 'primary' : 'secondary'}
              onPress={() => setFilter(id)}
              style={{ width: 'auto', paddingHorizontal: 10, paddingVertical: 6 }}
            />
          ))}
        </View>

        {error ? <Callout tone="danger">{error}</Callout> : null}
        {loading ? <Text style={{ ...textStyle(typeScale.body), color: color.steel }}>Loading…</Text> : null}
        {!loading && !error && shown.length === 0 ? (
          <Text style={{ ...textStyle(typeScale.body), color: color.mute }}>
            {filter === 'ALL' ? 'No items yet. Add them in Items.' : 'Nothing here right now.'}
          </Text>
        ) : null}

        {shown.map((l) => {
          const reason = lowReasonLabel(l);
          const fromHq = mustOrderFromHq(l);
          return (
            <Pressable key={l.partId} onPress={() => router.push({ pathname: '/(app)/inventory/item/[partId]', params: { partId: l.partId } })}>
              <Card tone={l.lowBecause === 'OUT' ? 'danger' : l.lowBecause ? 'warning' : undefined}>
                <View className="flex-row items-start justify-between" style={{ gap: 8 }}>
                  <Text style={{ ...textStyle(typeScale.cardTitle), color: color.ink, flex: 1 }}>{l.name}</Text>
                  <Row gap={6}>
                    {l.lowBecause === 'OUT' ? <Chip label="Out" tone="danger" /> : l.lowBecause ? <Chip label="Low" tone="warning" /> : null}
                    {l.part?.soldByHq ? <Chip label="HQ" /> : null}
                  </Row>
                </View>
                <Text style={{ ...textStyle(typeScale.value), color: color.steel, marginTop: 2 }}>
                  {[String(l.currentStock), coverLabel(l), l.daysOfCover == null && l.minimumStock != null ? `min ${l.minimumStock}` : null]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
                {reason ? <Text style={{ ...textStyle(typeScale.helper), color: l.lowBecause === 'OUT' ? color.danger : color.warn }}>{reason}</Text> : null}
                {l.lowBecause ? (
                  <View style={{ marginTop: 8 }}>
                    {fromHq ? (
                      <Button label="Order from HQ" variant="gated" gate="MANAGER+·PROC" disabled={!canDraftOrder(user)} onPress={() => restock(l)} />
                    ) : (
                      <Button label="Request more" variant="gated" gate="MANAGER+·ADMIN·PROC" disabled={!canCreatePurchaseRequest(user)} onPress={() => restock(l)} />
                    )}
                  </View>
                ) : null}
              </Card>
            </Pressable>
          );
        })}

        <Text style={{ ...textStyle(typeScale.helper), color: color.mute }}>
          Low means it runs out before its target days when the item has usage data; without usage data, it's at or
          below minimum stock.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
