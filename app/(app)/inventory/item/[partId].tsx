import { useCallback, useState } from 'react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Callout, Chip, KV, Row, Section } from '../../../../components';
import { useAuth } from '../../../../auth/AuthContext';
import { canCreatePurchaseRequest, canDraftOrder, canEditItems, canRequestStockAdjustment } from '../../../../auth/permissions';
import { getBurnRate } from '../../../../api/inventory';
import { listParts } from '../../../../api/parts';
import { getCatalog } from '../../../../api/procurement';
import { ApiError } from '../../../../api/httpError';
import type { BurnRateResponse, BurnRateSource, PartResponse } from '../../../../api/types';
import { useTheme } from '../../../../theme/ThemeContext';
import { textStyle } from '../../../../theme/typeStyle';
import { encodeLines, lowBecause } from '../../../../lib/stockLevel';


const SOURCE_LABEL: Record<BurnRateSource, string> = {
  COMPUTED: 'Recent use',
  MANUAL_RATE: 'Daily use set by hand',
  MANUAL_LEVEL: 'Reorder point set by hand',
  NONE: 'No usage data',
};

// INV-05 — Item. One item's stock, how fast it goes, and whether it's the
// same as an item HQ sells. There's no single-item read on the server, so it
// comes from the item list. The stock history needs BE-26 (a per-item list of
// stock changes with who made them); until then the screen says so.
export default function ItemDetailScreen() {
  const { color, type: typeScale } = useTheme();
  const router = useRouter();
  const { partId } = useLocalSearchParams<{ partId: string }>();
  const { user, token } = useAuth();
  const [part, setPart] = useState<PartResponse | null>(null);
  const [burn, setBurn] = useState<BurnRateResponse | null>(null);
  const [hqName, setHqName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!token || !partId) return;
      setLoading(true);
      setError(null);
      listParts(token)
        .then((all) => {
          const found = all.find((p) => p.id === partId) ?? null;
          setPart(found);
          if (!found) setError('This item no longer exists.');
          if (found?.catalogPartId) {
            getCatalog(token)
              .then((items) => setHqName(items.find((c) => c.id === found.catalogPartId)?.name ?? null))
              .catch(() => setHqName(null));
          }
        })
        .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load this item.'))
        .finally(() => setLoading(false));
      getBurnRate(partId, token)
        .then(setBurn)
        .catch(() => setBurn(null));
    }, [token, partId]),
  );

  if (!part) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: color.surface }}>
        <View className="flex-1 gap-md px-xl pt-xl">
          <Text style={{ ...textStyle(typeScale.screenTitle), color: color.ink }}>Item</Text>
          {loading ? <Text style={{ ...textStyle(typeScale.body), color: color.steel }}>Loading…</Text> : null}
          {error ? <Callout tone="danger">{error}</Callout> : null}
        </View>
      </SafeAreaView>
    );
  }

  const why = lowBecause(part.currentStock, part.minimumStock, burn ?? undefined);
  const hasUsage = burn?.burnRateSource === 'COMPUTED' || burn?.burnRateSource === 'MANUAL_RATE';
  const mustOrderFromHq = part.mandatoryFromHq && !!part.catalogPartId;
  const suggest = burn?.suggestedQty ?? part.reorderQuantity ?? null;

  const restock = () =>
    router.push({
      pathname: mustOrderFromHq ? '/(app)/purchase-orders/create' : '/(app)/purchase-requests/create',
      params: { lines: encodeLines([{ partId: mustOrderFromHq ? part.catalogPartId! : part.id, quantity: suggest }]) },
    });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.surface }}>
      <ScrollView contentContainerClassName="gap-md px-xl pt-xl pb-xl">
        <Text style={{ ...textStyle(typeScale.screenTitle), color: color.ink }}>{part.name}</Text>
        <Row gap={6}>
          {why === 'OUT' ? <Chip label="Out" tone="danger" /> : why ? <Chip label="Low" tone="warning" /> : null}
          {part.mandatoryFromHq ? <Chip label="Must buy from HQ" /> : part.soldByHq ? <Chip label="HQ sells it" /> : null}
          {part.retired ? <Chip label="Retired" tone="danger" /> : null}
        </Row>

        <View>
          <KV k="In stock" v={String(part.currentStock)} strong />
          <KV k="Minimum" v={part.minimumStock != null ? String(part.minimumStock) : '—'} />
          <KV k="Reorder quantity" v={part.reorderQuantity != null ? String(part.reorderQuantity) : '—'} />
          <KV k="Category" v={[part.categoryName, part.partTypeName].filter(Boolean).join(' · ') || '—'} />
        </View>

        <Section>Usage</Section>
        <View>
          <KV k="Worked out from" v={burn ? SOURCE_LABEL[burn.burnRateSource] : 'No usage data'} />
          {hasUsage && burn?.burnRate != null ? <KV k="Uses" v={`~${Math.round(burn.burnRate * 10) / 10} a day`} /> : null}
          <KV
            k="Days left"
            v={hasUsage && burn?.daysOfCover != null ? `~${Math.round(burn.daysOfCover)} · target ${burn.targetDays ?? '—'}` : 'No usage data'}
          />
          {suggest != null ? <KV k="Suggest" v={String(suggest)} /> : null}
        </View>
        {!hasUsage ? (
          <Text style={{ ...textStyle(typeScale.helper), color: color.mute }}>Without usage data, low means at or below minimum stock.</Text>
        ) : null}

        <Section>HQ catalog</Section>
        {part.catalogPartId ? (
          <>
            <KV k="Same as" v={`${hqName ?? 'An HQ item'} (HQ)`} />
            <Text style={{ ...textStyle(typeScale.helper), color: color.mute }}>Only HQ can change or remove this link.</Text>
          </>
        ) : (
          <Text style={{ ...textStyle(typeScale.helper), color: color.steel }}>
            Not linked to an item HQ sells. If HQ sells this, link it under Edit item so orders from HQ add to this stock.
          </Text>
        )}

        <Section>History</Section>
        <Callout>This item's list of stock changes isn't available yet. It's coming with who made each change.</Callout>

        {!part.retired ? (
          <View className="gap-sm">
            <Button
              label="Adjust count"
              variant="gated"
              gate="MANAGER+"
              disabled={!canRequestStockAdjustment(user)}
              onPress={() => router.push({ pathname: '/(app)/inventory/adjust', params: { partId: part.id } })}
            />
            {mustOrderFromHq ? (
              <Button label="Order from HQ" variant="gated" gate="MANAGER+·PROC" disabled={!canDraftOrder(user)} onPress={restock} />
            ) : (
              <Button label="Request more" variant="gated" gate="MANAGER+·ADMIN·PROC" disabled={!canCreatePurchaseRequest(user)} onPress={restock} />
            )}
          </View>
        ) : null}
        <Button
          label="Edit item"
          variant="gated"
          gate="MANAGER+·ADMIN"
          disabled={!canEditItems(user)}
          onPress={() => router.push({ pathname: '/(app)/inventory/item-form', params: { partId: part.id } })}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
