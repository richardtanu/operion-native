import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Callout, Card, Chip, Field, Row, Section, SelectField } from '../../../components';
import { useAuth } from '../../../auth/AuthContext';
import { createPurchaseRequest } from '../../../api/procurement';
import { listParts } from '../../../api/parts';
import { ApiError } from '../../../api/httpError';
import type { PartResponse, PurchaseRequestResponse } from '../../../api/types';
import { useTheme } from '../../../theme/ThemeContext';
import { textStyle } from '../../../theme/typeStyle';


type Line = { key: string; partId: string; partName: string; quantity: string };

let lineKeySeq = 0;
function newLine(): Line {
  lineKeySeq += 1;
  return { key: `line-${lineKeySeq}`, partId: '', partName: '', quantity: '' };
}

// PROC-01 — Purchase Request Create. Blocking-error, manual-retry: calls
// api/procurement.ts directly, never through the outbox.
export default function CreatePurchaseRequestScreen() {
  const { color, type: typeScale } = useTheme();
  const router = useRouter();
  const { user, token } = useAuth();
  const [lines, setLines] = useState<Line[]>([newLine()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<PurchaseRequestResponse | null>(null);

  const [parts, setParts] = useState<PartResponse[]>([]);
  const [partsLoading, setPartsLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    listParts(token)
      .then((all) => setParts(all.filter((p) => !p.retired)))
      .catch(() => setParts([]))
      .finally(() => setPartsLoading(false));
  }, [token]);

  const updateLine = (key: string, patch: Partial<Line>) =>
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const addLine = () => setLines((prev) => [...prev, newLine()]);
  const removeLine = (key: string) => setLines((prev) => prev.filter((l) => l.key !== key));

  const handleSubmit = async () => {
    setError(null);
    const items = lines
      .map((l) => ({ partId: l.partId.trim(), quantity: Number(l.quantity) }))
      .filter((i) => i.partId.length > 0);

    if (items.length === 0) return setError('Add at least one line with a Part ID.');
    if (items.some((i) => !Number.isFinite(i.quantity) || i.quantity <= 0)) {
      return setError('Every line needs a quantity greater than zero.');
    }
    if (!token) return setError('Not signed in.');
    if (!user?.id) return setError('Could not determine the current user — try signing in again.');

    setSubmitting(true);
    try {
      const response = await createPurchaseRequest({ requestedBy: user.id, items }, token);
      setCreated(response);
      setLines([newLine()]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create the purchase request.');
    } finally {
      setSubmitting(false);
    }
  };

  if (created) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: color.surface }}>
        <View className="flex-1 gap-lg px-xl pt-xl">
          <Text style={{ ...textStyle(typeScale.heading), color: color.ink }}>Request created</Text>
          <Card>
            <Row>
              <Text style={{ ...textStyle(typeScale.body), color: color.steel }}>Status</Text>
              <Chip label={created.status} tone="pending" />
            </Row>
            <Text style={{ ...textStyle(typeScale.helper), color: color.steel, marginTop: 6 }}>
              {created.items.length} line item(s)
            </Text>
            <Text style={{ ...textStyle(typeScale.helper), color: color.mute, marginTop: 2 }}>ID: {created.id}</Text>
          </Card>
          <Button label="Create another" variant="secondary" onPress={() => setCreated(null)} />
          <Button label="Back to Procurement" onPress={() => router.replace('/(app)/procurement')} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.surface }}>
      <ScrollView contentContainerClassName="gap-md px-xl pt-xl pb-xl">
        <Text style={{ ...textStyle(typeScale.screenTitle), color: color.ink }}>New Request</Text>

        <Section>Line items</Section>
        {lines.map((line) => (
          <Card key={line.key}>
            <Row>
              <SelectField
                label="Part"
                value={line.partId || null}
                loading={partsLoading}
                placeholder="Select part…"
                items={parts.map((p) => ({
                  id: p.id,
                  label: p.name,
                  // sublabel: [p.brand, p.categoryName].filter(Boolean).join(' · ') || undefined,
                  group: p.partTypeName ?? 'Uncategorized',
                }))}
                onChange={(id) => {
                  const part = parts.find((p) => p.id === id);
                  if (part) updateLine(line.key, { partId: part.id, partName: part.name });
                }}
              />
              <View style={{ width: 82 }}>
                <Field label="Qty" value={line.quantity} onChangeText={(v) => updateLine(line.key, { quantity: v })} 
                placeholder=" " 
                mono keyboardType="numeric" />
              </View>
            </Row>
            {lines.length > 1 ? (
              <View style={{ marginTop: 8 }}>
                <Button label="Remove line" variant="secondary" onPress={() => removeLine(line.key)} />
              </View>
            ) : null}
          </Card>
        ))}
        <Button label="+ Add line" variant="secondary" onPress={addLine} />

        <Field label="Requested by" value={user?.fullName ?? 'you (current user)'} variant="derived" />

        <View>
          <Text style={{ ...textStyle(typeScale.fieldLabel), color: color.mute, marginBottom: 3 }}>Starts at</Text>
          <Chip tone="pending" label="Pending" />
        </View>

        <Callout>No cost fields on this screen — quantity only. Pricing enters at Realisasi, not here.</Callout>
        <Callout tone="warning">No role or scope gate: anyone signed in can submit.</Callout>

        {error ? <Text style={{ ...textStyle(typeScale.helper), color: color.danger }}>{error}</Text> : null}

        {!partsLoading && parts.length === 0 ? (
          <Callout tone="warning">
            No parts found. Create one in the Parts module first — Purchase Requests can't reference a part that
            doesn't exist yet.
          </Callout>
        ) : null}

        <Button label={submitting ? 'Creating…' : 'Create Request'} onPress={handleSubmit} disabled={submitting} />
      </ScrollView>
    </SafeAreaView>
  );
}
