import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check } from 'lucide-react-native';
import { Button, Callout, CeilingBar, Card, Chip, Field, KV, Row, Section } from '../../../components';
import { useAuth } from '../../../auth/AuthContext';
import { createPurchaseAuthorization, listPurchaseRequests } from '../../../api/procurement';
import { ApiError } from '../../../api/httpError';
import type { PurchaseRequestAuthorizationResponse, PurchaseRequestResponse } from '../../../api/types';
import { useTheme } from '../../../theme/ThemeContext';
import { textStyle } from '../../../theme/typeStyle';


type Line = { key: string; partId: string; authorizedQty: string; maxValue: string };

let lineKeySeq = 0;
function newLine(): Line {
  lineKeySeq += 1;
  return { key: `line-${lineKeySeq}`, partId: '', authorizedQty: '', maxValue: '' };
}

// PROC-03 — PRA Authorization. Creating this record IS the authorization —
// there is no separate approve step. Ceilings are per line only; there is
// deliberately no header total (open product decision, not a bug to fix).
export default function CreatePurchaseAuthorizationScreen() {
  const { color, type: typeScale, radius, border } = useTheme();
  const router = useRouter();
  const { token } = useAuth();
  const [approvedPrs, setApprovedPrs] = useState<PurchaseRequestResponse[]>([]);
  const [selectedPrIds, setSelectedPrIds] = useState<string[]>([]);
  const [lines, setLines] = useState<Line[]>([newLine()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<PurchaseRequestAuthorizationResponse | null>(null);

  useEffect(() => {
    if (!token) return;
    listPurchaseRequests(token)
      .then((all) => setApprovedPrs(all.filter((pr) => pr.status === 'APPROVED')))
      .catch(() => setApprovedPrs([]));
  }, [token]);

  const togglePr = (id: string) =>
    setSelectedPrIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const updateLine = (key: string, patch: Partial<Line>) =>
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const addLine = () => setLines((prev) => [...prev, newLine()]);

  const handleSubmit = async () => {
    setError(null);
    if (selectedPrIds.length === 0) return setError('Select at least one approved purchase request.');

    const items = lines
      .filter((l) => l.partId.trim().length > 0)
      .map((l) => ({ partId: l.partId.trim(), authorizedQty: Number(l.authorizedQty), maxValue: Number(l.maxValue) }));

    if (items.length === 0) return setError('Add at least one ceiling line.');
    if (items.some((i) => !Number.isFinite(i.authorizedQty) || i.authorizedQty <= 0 || !Number.isFinite(i.maxValue) || i.maxValue <= 0)) {
      return setError('Every line needs an authorized quantity and max value greater than zero.');
    }
    if (!token) return setError('Not signed in.');

    setSubmitting(true);
    try {
      const response = await createPurchaseAuthorization({ purchaseRequestIds: selectedPrIds, items }, token);
      setCreated(response);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create the authorization.');
    } finally {
      setSubmitting(false);
    }
  };

  if (created) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: color.surface }}>
        <ScrollView contentContainerClassName="gap-md px-xl pt-xl pb-xl">
          <Text style={{ ...textStyle(typeScale.heading), color: color.ink }}>Authorization created</Text>
          <Chip label={created.status} tone={created.status === 'CANCELLED' ? 'neutral' : 'success'} solid />
          <Text style={{ ...textStyle(typeScale.helper), color: color.mute }}>
            Also reachable: active · partially_fulfilled · fulfilled · cancelled — recomputed, never stored
          </Text>

          {created.items.map((item) => (
            <Card key={item.id}>
              <Text style={{ ...textStyle(typeScale.body), color: color.ink }}>{item.partName}</Text>
              <View style={{ marginTop: 8 }}>
                <CeilingBar authorized={item.authorizedQty} consumed={item.purchasedQty} />
              </View>
              <View style={{ marginTop: 8 }}>
                <KV k="Purchased" v={item.purchasedValue != null ? `${item.purchasedQty} · Rp ${item.purchasedValue.toLocaleString('id-ID')}` : `${item.purchasedQty} · —`} derived />
                <KV k="Remaining" v={item.remainingValue != null ? `${item.remainingQty} · Rp ${item.remainingValue.toLocaleString('id-ID')}` : `${item.remainingQty} · —`} derived strong />
              </View>
            </Card>
          ))}

          <Button label="Back to Procurement" onPress={() => router.replace('/(app)/procurement')} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.surface }}>
      <ScrollView contentContainerClassName="gap-md px-xl pt-xl pb-xl">
        <Text style={{ ...textStyle(typeScale.screenTitle), color: color.ink }}>New Authorization</Text>

        <Section>Purchase requests being authorized</Section>
        {approvedPrs.length === 0 ? (
          <Text style={{ ...textStyle(typeScale.body), color: color.mute }}>No APPROVED purchase requests found.</Text>
        ) : (
          approvedPrs.map((pr) => (
            <Pressable
              key={pr.id}
              onPress={() => togglePr(pr.id)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selectedPrIds.includes(pr.id) }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}
            >
              <View
                style={{
                  width: 19,
                  height: 19,
                  borderWidth: border.base,
                  borderColor: color.ink,
                  backgroundColor: selectedPrIds.includes(pr.id) ? color.ink : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: radius.sm,
                }}
              >
                {selectedPrIds.includes(pr.id) ? <Check size={13} color={color.tag} /> : null}
              </View>
              <Text style={{ ...textStyle(typeScale.value), color: color.ink }}>{pr.id}</Text>
            </Pressable>
          ))
        )}

        <Section>Ceiling lines</Section>
        {lines.map((line) => (
          <Card key={line.key}>
            <Field label="Part" value={line.partId} onChangeText={(v) => updateLine(line.key, { partId: v })} placeholder="Part ID" />
            <View style={{ marginTop: 9 }}>
              <Row>
                <Field label="Authorized qty" value={line.authorizedQty} onChangeText={(v) => updateLine(line.key, { authorizedQty: v })} mono keyboardType="numeric" />
                <Field label="Max value" value={line.maxValue} onChangeText={(v) => updateLine(line.key, { maxValue: v })} mono keyboardType="numeric" />
              </Row>
            </View>
          </Card>
        ))}
        <Button label="+ Add line" variant="secondary" onPress={addLine} />

        <Callout tone="warning">
          No total row, deliberately. Ceilings exist per line only — there is no cap above line level, so several
          lines each individually within ceiling can still overrun a budget nobody stated.
        </Callout>
        <Callout>There is no approve step. Creating this record is the authorization.</Callout>
        <Callout tone="danger">
          Nothing notifies anyone when a PRA is created — no notification type exists for it. Purchasing finds out by
          looking.
        </Callout>
        <Callout tone="warning">
          Cost fields on this screen (max value, purchased value, remaining value) are Owner+-only — below that scope
          they come back null from the API and render masked, not as an error.
        </Callout>

        {error ? <Text style={{ ...textStyle(typeScale.helper), color: color.danger }}>{error}</Text> : null}

        <Button label={submitting ? 'Creating…' : 'Create (= authorize)'} onPress={handleSubmit} disabled={submitting} />
      </ScrollView>
    </SafeAreaView>
  );
}
