import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Callout, Card, Chip, Field, Row, Section, SelectField } from '../../../components';
import { useAuth } from '../../../auth/AuthContext';
import { createPurchaseRequest } from '../../../api/procurement';
import { getTenantTree } from '../../../api/tenants';
import { canCreatePurchaseRequest, canFileForAnotherStore } from '../../../auth/permissions';
import { listParts } from '../../../api/parts';
import { ApiError } from '../../../api/httpError';
import type { PartResponse, PurchaseRequestResponse, TenantResponse } from '../../../api/types';
import { useTheme } from '../../../theme/ThemeContext';
import { textStyle } from '../../../theme/typeStyle';
import { decodeLines } from '../../../lib/stockLevel';


type Line = { key: string; partId: string; partName: string; quantity: string };

let lineKeySeq = 0;
function newLine(): Line {
  lineKeySeq += 1;
  return { key: `line-${lineKeySeq}`, partId: '', partName: '', quantity: '' };
}

// PROC-01 — Purchase Request Create. Blocking-error, manual-retry: calls
// api/procurement.ts directly, never through the outbox. BE-14: only
// MANAGER+ or ADMIN / PROCUREMENT may file; HQ picks the store (required, no
// default), a Store Manager's store is fixed. Restock (INV-02) and Stock
// (INV-01) open it with `lines=partId:qty,…` filled in.
export default function CreatePurchaseRequestScreen() {
  const { color, type: typeScale } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ lines?: string }>();
  const { user, token } = useAuth();
  const [lines, setLines] = useState<Line[]>([newLine()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<PurchaseRequestResponse | null>(null);

  const [stores, setStores] = useState<TenantResponse[]>([]);
  const [storeId, setStoreId] = useState<string | null>(null);
  const mayCreate = canCreatePurchaseRequest(user);
  const picksStore = canFileForAnotherStore(user) && stores.length > 1;

  const [parts, setParts] = useState<PartResponse[]>([]);
  const [partsLoading, setPartsLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    listParts(token)
      .then((all) => {
        const active = all.filter((p) => !p.retired);
        setParts(active);
        const prefill = decodeLines(params.lines)
          .map((l) => ({ part: active.find((p) => p.id === l.partId), quantity: l.quantity }))
          .filter((l) => l.part);
        if (prefill.length) {
          setLines(prefill.map((l) => ({ ...newLine(), partId: l.part!.id, partName: l.part!.name, quantity: l.quantity })));
        }
      })
      .catch(() => setParts([]))
      .finally(() => setPartsLoading(false));
    getTenantTree(token)
      .then(setStores)
      .catch(() => setStores([]));
  }, [token, params.lines]);

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
    if (picksStore && !storeId) return setError('Pick the store this request is for.');

    setSubmitting(true);
    try {
      const response = await createPurchaseRequest(
        { requestedBy: user.id, items, ...(picksStore && storeId ? { tenantId: storeId } : {}) },
        token,
      );
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
              {created.items.length} line item(s) · for {created.tenantName}
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

        {picksStore ? (
          <SelectField
            label="Store"
            value={storeId}
            placeholder="Pick the store…"
            items={stores.map((t) => ({ id: t.id, label: t.name, sublabel: t.code }))}
            onChange={setStoreId}
          />
        ) : (
          <Field label="Store" value={stores[0]?.name ?? 'Your store'} variant="derived" />
        )}
        <Field label="Requested by" value={user?.fullName ?? 'you (current user)'} variant="derived" />
        {picksStore ? (
          <Text style={{ ...textStyle(typeScale.helper), color: color.mute }}>
            The part list shows every store's items. Pick the ones that belong to the store above — the server
            refuses another store's part.
          </Text>
        ) : null}

        <View>
          <Text style={{ ...textStyle(typeScale.fieldLabel), color: color.mute, marginBottom: 3 }}>Starts at</Text>
          <Chip tone="pending" label="Pending" />
        </View>

        <Callout>No cost fields on this screen — quantity only. Pricing enters at Realisasi, not here.</Callout>
        {!mayCreate ? (
          <Callout tone="warning" title="Not available for your account">
            Requests are filed by the Store Manager (Manager scope or above), or by HQ Admin and Procurement.
          </Callout>
        ) : null}

        {error ? <Text style={{ ...textStyle(typeScale.helper), color: color.danger }}>{error}</Text> : null}

        {!partsLoading && parts.length === 0 ? (
          <Callout tone="warning">
            No parts found. Create one in the Parts module first — Purchase Requests can't reference a part that
            doesn't exist yet.
          </Callout>
        ) : null}

        <Button
          label={submitting ? 'Creating…' : 'Create Request'}
          variant="gated"
          gate="MANAGER+·ADMIN·PROC"
          onPress={handleSubmit}
          disabled={submitting || !mayCreate}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
