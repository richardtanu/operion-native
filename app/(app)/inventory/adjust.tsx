import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Callout, Card, Field, FieldLabel, KV, Row, SelectField } from '../../../components';
import { useAuth } from '../../../auth/AuthContext';
import { canRequestStockAdjustment } from '../../../auth/permissions';
import { requestStockAdjustment } from '../../../api/inventory';
import { listParts } from '../../../api/parts';
import { ApiError } from '../../../api/httpError';
import type { PartResponse, StockAdjustmentResponse } from '../../../api/types';
import { useTheme } from '../../../theme/ThemeContext';
import { textStyle } from '../../../theme/typeStyle';


type Direction = 'REMOVE' | 'ADD';

// INV-04 — Ask for a stock adjustment (BE-25). The Store Manager asks with a
// reason; the count changes only when one of the store's Owners approves,
// and they're told. Not queued: the request must reach the Owner now.
export default function AdjustCountScreen() {
  const { color, type: typeScale } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ partId?: string }>();
  const { user, token } = useAuth();
  const mayAsk = canRequestStockAdjustment(user);

  const [parts, setParts] = useState<PartResponse[]>([]);
  const [partsLoading, setPartsLoading] = useState(true);
  const [partId, setPartId] = useState<string | null>(params.partId ?? null);
  const [direction, setDirection] = useState<Direction>('REMOVE');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<StockAdjustmentResponse | null>(null);

  useEffect(() => {
    if (!token) return;
    listParts(token)
      .then((all) => setParts(all.filter((p) => !p.retired)))
      .catch(() => setParts([]))
      .finally(() => setPartsLoading(false));
  }, [token]);

  const part = parts.find((p) => p.id === partId);
  const amount = Number(quantity);
  const signed = Number.isInteger(amount) && amount > 0 ? (direction === 'REMOVE' ? -amount : amount) : null;
  const after = part && signed != null ? part.currentStock + signed : null;

  const handleSubmit = async () => {
    setError(null);
    if (!partId) return setError('Pick the item.');
    if (signed == null) return setError('Enter a whole number greater than zero.');
    if (after != null && after < 0) return setError(`That would leave ${after}. There are only ${part!.currentStock} in stock.`);
    if (!reason.trim()) return setError('Say why the count is wrong.');
    if (!token) return setError('Not signed in.');
    setSubmitting(true);
    try {
      setCreated(await requestStockAdjustment({ partId, quantity: signed, reason: reason.trim() }, token));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send the request.');
    } finally {
      setSubmitting(false);
    }
  };

  if (created) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: color.surface }}>
        <View className="flex-1 gap-lg px-xl pt-xl">
          <Text style={{ ...textStyle(typeScale.heading), color: color.ink }}>Sent to the Owner</Text>
          <Card>
            <KV k="Item" v={created.partName} />
            <KV k="Change" v={created.quantity > 0 ? `+${created.quantity}` : String(created.quantity)} strong />
            <KV k="Reason" v={created.reason} />
          </Card>
          <Text style={{ ...textStyle(typeScale.helper), color: color.steel }}>
            The count changes when one of the store's Owners approves. They've been told.
          </Text>
          <Button label="See adjustments" variant="secondary" onPress={() => router.replace('/(app)/inventory/adjustments')} />
          <Button label="Done" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.surface }}>
      <ScrollView contentContainerClassName="gap-md px-xl pt-xl pb-xl">
        <Text style={{ ...textStyle(typeScale.screenTitle), color: color.ink }}>Adjust count</Text>

        <SelectField
          label="Item"
          value={partId}
          loading={partsLoading}
          placeholder="Select item…"
          items={parts.map((p) => ({ id: p.id, label: p.name, sublabel: `${p.currentStock} in stock`, group: p.categoryName ?? 'Uncategorized' }))}
          onChange={setPartId}
        />

        <View style={{ gap: 6 }}>
          <FieldLabel>Change</FieldLabel>
          <Row gap={0}>
            {(['REMOVE', 'ADD'] as Direction[]).map((d) => (
              <View key={d} style={{ flex: 1 }}>
                <Button label={d === 'REMOVE' ? 'Remove' : 'Add'} variant={direction === d ? 'primary' : 'secondary'} onPress={() => setDirection(d)} />
              </View>
            ))}
          </Row>
        </View>

        <Row>
          <Field label="Quantity" value={quantity} onChangeText={setQuantity} mono keyboardType="numeric" placeholder="1" />
          <Field label="After" value={after != null ? String(after) : '—'} variant="derived" mono />
        </Row>
        <Field label="Reason" value={reason} onChangeText={setReason} placeholder="e.g. Bag torn, BBs spilled" />

        <Text style={{ ...textStyle(typeScale.helper), color: color.mute }}>
          The count changes only when an Owner approves. The Owner is told.
        </Text>

        {!mayAsk ? <Callout tone="warning">Only the Store Manager and the Owner can ask for an adjustment.</Callout> : null}
        {error ? <Callout tone="danger">{error}</Callout> : null}

        <Button
          label={submitting ? 'Sending…' : 'Ask for adjustment'}
          variant="gated"
          gate="MANAGER+"
          disabled={submitting || !mayAsk}
          onPress={handleSubmit}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
