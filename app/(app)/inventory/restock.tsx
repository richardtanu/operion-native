import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check } from 'lucide-react-native';
import { Button, Callout, Card, Section } from '../../../components';
import { useAuth } from '../../../auth/AuthContext';
import { canCreatePurchaseRequest, canDraftOrder } from '../../../auth/permissions';
import { useTheme } from '../../../theme/ThemeContext';
import { textStyle } from '../../../theme/typeStyle';
import { encodeLines, lowReasonLabel, worstFirst, type StockLine } from '../../../lib/stockLevel';
import { useStockLines } from '../../../lib/useStockLines';


// INV-02 — Restock. Turns "running low" into a request in one tap. Items HQ
// says must come from HQ go to Order from HQ (PROC-07); everything else to a
// purchase request (PROC-01). Both open filled in; nothing is sent from here.
export default function RestockScreen() {
  const { color, type: typeScale, radius, border } = useTheme();
  const router = useRouter();
  const { user, token } = useAuth();
  const { lines, loading, error } = useStockLines(token);
  const [unselected, setUnselected] = useState<string[]>([]);

  const multiStore = new Set(lines.map((l) => l.tenantId)).size > 1;
  const low = lines.filter((l) => l.lowBecause != null).sort(worstFirst);
  // An item that must be bought from HQ can only be ordered from HQ — and only once it's linked to HQ's item.
  const fromHq = low.filter((l) => l.part?.mandatoryFromHq && l.part.catalogPartId);
  const elsewhere = low.filter((l) => !fromHq.includes(l));
  const target = lines.find((l) => l.targetDays != null)?.targetDays;

  useEffect(() => setUnselected([]), [lines]);

  const toggle = (id: string) => setUnselected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const picked = (group: StockLine[]) => group.filter((l) => !unselected.includes(l.partId));

  const orderFromHq = () =>
    router.push({
      pathname: '/(app)/purchase-orders/create',
      params: { lines: encodeLines(picked(fromHq).map((l) => ({ partId: l.part!.catalogPartId!, quantity: l.suggestedQty }))) },
    });
  const request = () =>
    router.push({
      pathname: '/(app)/purchase-requests/create',
      params: { lines: encodeLines(picked(elsewhere).map((l) => ({ partId: l.partId, quantity: l.suggestedQty }))) },
    });

  const renderLine = (l: StockLine) => {
    const on = !unselected.includes(l.partId);
    return (
      <Pressable key={l.partId} onPress={() => toggle(l.partId)} accessibilityRole="checkbox" accessibilityState={{ checked: on }}>
        <Card tone={on ? 'success' : undefined}>
          <View className="flex-row items-start" style={{ gap: 10 }}>
            <View
              style={{
                width: 22,
                height: 22,
                marginTop: 2,
                borderRadius: radius.sm,
                borderWidth: border.base,
                borderColor: on ? color.ink : color.line,
                backgroundColor: on ? color.ink : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {on ? <Check size={14} strokeWidth={3} color={color.panel} /> : null}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ ...textStyle(typeScale.cardTitle), color: color.ink }}>{l.name}</Text>
              <Text style={{ ...textStyle(typeScale.value), color: color.steel }}>
                {`${multiStore ? `${l.tenantName} · ` : ''}${l.currentStock} left${l.suggestedQty != null ? ` · suggest ${l.suggestedQty}` : ''}`}
              </Text>
              <Text style={{ ...textStyle(typeScale.helper), color: l.lowBecause === 'OUT' ? color.danger : color.warn }}>{lowReasonLabel(l)}</Text>
            </View>
          </View>
        </Card>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.surface }}>
      <ScrollView contentContainerClassName="gap-md px-xl pt-xl pb-xl">
        <Text style={{ ...textStyle(typeScale.screenTitle), color: color.ink }}>Restock</Text>
        <Text style={{ ...textStyle(typeScale.helper), color: color.steel }}>
          {`Worst first. Suggested amounts cover each item's ${target ?? 14}-day target; change them on the next screen.`}
        </Text>

        {error ? <Callout tone="danger">{error}</Callout> : null}
        {loading ? <Text style={{ ...textStyle(typeScale.body), color: color.steel }}>Loading…</Text> : null}
        {!loading && !error && low.length === 0 ? (
          <Text style={{ ...textStyle(typeScale.body), color: color.mute }}>Nothing is running low.</Text>
        ) : null}

        {fromHq.length ? (
          <>
            <Section>From HQ · order</Section>
            {fromHq.map(renderLine)}
            <Button
              label="Order these from HQ"
              variant="gated"
              gate="MANAGER+·PROC"
              disabled={!canDraftOrder(user) || picked(fromHq).length === 0}
              onPress={orderFromHq}
            />
          </>
        ) : null}

        {elsewhere.length ? (
          <>
            <Section>Elsewhere · request</Section>
            {elsewhere.map(renderLine)}
            <Button
              label="Request these"
              variant="gated"
              gate="MANAGER+·ADMIN·PROC"
              disabled={!canCreatePurchaseRequest(user) || picked(elsewhere).length === 0}
              onPress={request}
            />
          </>
        ) : null}

        <Text style={{ ...textStyle(typeScale.helper), color: color.mute }}>
          The Owner approves later: on the request, or when sending the order to HQ.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
