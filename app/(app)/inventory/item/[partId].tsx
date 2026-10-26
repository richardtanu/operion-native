import { useCallback, useState } from 'react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Callout, Chip, KV, Row, Section } from '../../../../components';
import { useAuth } from '../../../../auth/AuthContext';
import { canCreatePurchaseRequest, canDraftOrder, canEditItems, canRequestStockAdjustment } from '../../../../auth/permissions';
import { getBurnRate, getStockSummary } from '../../../../api/inventory';
import { listPartMovements, listParts } from '../../../../api/parts';
import { getCatalog } from '../../../../api/procurement';
import { ApiError } from '../../../../api/httpError';
import type { BurnRateResponse, BurnRateSource, PartResponse, StockMovementResponse, StockMovementType, StockSummaryRow } from '../../../../api/types';
import { useTheme } from '../../../../theme/ThemeContext';
import { textStyle } from '../../../../theme/typeStyle';
import { formatDayLabel, formatTime, parseLocalDateTime } from '../../../../lib/dates';
import { rp } from '../../../../lib/money';
import { encodeLines, lowOf } from '../../../../lib/stockLevel';


const SOURCE_LABEL: Record<BurnRateSource, string> = {
  COMPUTED: 'Recent use',
  MANUAL_RATE: 'Daily use set by hand',
  MANUAL_LEVEL: 'Reorder point set by hand',
  NONE: 'No usage data',
};

const MOVE_LABEL: Record<StockMovementType, string> = {
  INITIAL_STOCK: 'Starting stock',
  PURCHASE: 'Received',
  MAINTENANCE_USAGE: 'Used in a repair',
  ADJUSTMENT: 'Adjusted',
  RETURN: 'Returned',
  CONSUMABLE_TAKE: 'Taken',
};

// INV-05 — Item. One item's stock, how fast it goes, whether it's the same as
// an item HQ sells, and every stock change with who made it (BE-26). There's
// no single-item read on the server, so the item comes from the item list
// and its "low" verdict from its store's stock summary (BE-27).
export default function ItemDetailScreen() {
  const { color, type: typeScale } = useTheme();
  const router = useRouter();
  const { partId } = useLocalSearchParams<{ partId: string }>();
  const { user, token } = useAuth();
  const [part, setPart] = useState<PartResponse | null>(null);
  const [row, setRow] = useState<StockSummaryRow | null>(null);
  const [burn, setBurn] = useState<BurnRateResponse | null>(null);
  const [moves, setMoves] = useState<StockMovementResponse[] | null>(null);
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
          if (!found) return setError('This item no longer exists.');
          getStockSummary(token, found.tenantId)
            .then((rows) => setRow(rows.find((r) => r.partId === found.id) ?? null))
            .catch(() => setRow(null));
          if (found.catalogPartId) {
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
      listPartMovements(partId, token)
        .then(setMoves)
        .catch(() => setMoves(null));
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

  const why = row ? lowOf(row) : null;
  const hasUsage = row?.daysOfCover != null;
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
        {why === 'RUNS_OUT_SOON' ? (
          <Text style={{ ...textStyle(typeScale.helper), color: color.warn }}>{`Runs out before its ${row?.targetDays ?? '—'}-day target`}</Text>
        ) : why === 'BELOW_MINIMUM' ? (
          <Text style={{ ...textStyle(typeScale.helper), color: color.warn }}>{`Below minimum ${part.minimumStock ?? 0}`}</Text>
        ) : null}

        <View>
          <KV k="Store" v={part.tenantName} />
          <KV k="In stock" v={String(part.currentStock)} strong />
          <KV k="Minimum" v={part.minimumStock != null ? String(part.minimumStock) : '—'} />
          <KV k="Reorder quantity" v={part.reorderQuantity != null ? String(part.reorderQuantity) : '—'} />
          <KV k="Category" v={[part.categoryName, part.partTypeName].filter(Boolean).join(' · ') || '—'} />
        </View>

        <Section>Usage</Section>
        <View>
          <KV k="Worked out from" v={burn ? SOURCE_LABEL[burn.burnRateSource] : 'No usage data'} />
          {hasUsage && burn?.burnRate != null ? <KV k="Uses" v={`~${Math.round(burn.burnRate * 10) / 10} a day`} /> : null}
          <KV k="Days left" v={hasUsage ? `~${Math.round(row!.daysOfCover!)} · target ${row!.targetDays ?? '—'}` : 'No usage data'} />
          {suggest != null ? <KV k="Suggest" v={String(suggest)} /> : null}
        </View>
        {!hasUsage ? (
          <Text style={{ ...textStyle(typeScale.helper), color: color.mute }}>Without usage data, low means at or below minimum stock.</Text>
        ) : null}

        <Section>HQ catalog</Section>
        {part.catalogPartId ? (
          <>
            <KV k="Same as" v={`${hqName ?? 'An HQ item'} (HQ)`} />
            {part.hqPrice != null ? <KV k="HQ's price" v={rp(part.hqPrice)} /> : null}
            <Text style={{ ...textStyle(typeScale.helper), color: color.mute }}>Only HQ can change or remove this link.</Text>
          </>
        ) : (
          <Text style={{ ...textStyle(typeScale.helper), color: color.steel }}>
            Not linked to an item HQ sells. If HQ sells this, link it under Edit item so orders from HQ add to this stock.
          </Text>
        )}

        <Section>History</Section>
        {moves == null ? (
          <Text style={{ ...textStyle(typeScale.helper), color: color.mute }}>Couldn't load the history.</Text>
        ) : moves.length === 0 ? (
          <Text style={{ ...textStyle(typeScale.helper), color: color.mute }}>No stock changes yet.</Text>
        ) : (
          moves.map((m) => {
            const at = parseLocalDateTime(m.createdAt);
            return (
              <View key={m.id} style={{ paddingBottom: 8, borderBottomWidth: 1, borderColor: color.hair }}>
                <View className="flex-row justify-between" style={{ gap: 8 }}>
                  <Text style={{ ...textStyle(typeScale.body), color: color.ink, flex: 1 }}>{MOVE_LABEL[m.movementType] ?? m.movementType}</Text>
                  <Text style={{ ...textStyle(typeScale.value), color: m.quantity < 0 ? color.danger : color.good }}>
                    {m.quantity > 0 ? `+${m.quantity}` : String(m.quantity)}
                  </Text>
                </View>
                <Text style={{ ...textStyle(typeScale.helper), color: color.steel }}>
                  {[`${m.beforeStock} → ${m.afterStock}`, m.actorName ?? 'Not recorded', at ? `${formatDayLabel(at)} ${formatTime(at)}` : null]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
                {m.notes ? <Text style={{ ...textStyle(typeScale.helper), color: color.mute }}>{m.notes}</Text> : null}
              </View>
            );
          })
        )}

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
