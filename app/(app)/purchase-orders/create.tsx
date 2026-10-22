import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Callout, Card, Chip, Field, KV, Row, Section } from '../../../components';
import { useAuth } from '../../../auth/AuthContext';
import { cancelPurchaseOrder, createPurchaseOrder, listPurchaseRequests, listSuppliers, sendPurchaseOrder } from '../../../api/procurement';
import { ApiError } from '../../../api/httpError';
import type { PurchaseOrderResponse, PurchaseRequestResponse, SupplierResponse } from '../../../api/types';
import { useTheme } from '../../../theme/ThemeContext';
import { textStyle } from '../../../theme/typeStyle';


const rp = (n: number | null | undefined) => (n == null ? '—' : `Rp ${Math.round(n).toLocaleString('id-ID')}`);

type Line = { key: string; partId: string; quantity: string; price: string };

let lineKeySeq = 0;
function newLine(): Line {
  lineKeySeq += 1;
  return { key: `line-${lineKeySeq}`, partId: '', quantity: '', price: '' };
}

// PROC-07 — Purchase Order (franchise leg). Outlet-to-centre restock,
// running parallel to PRA/Realisasi, not a marketplace purchase. Cost
// fields (totalAmount, price) come back null below Owner scope (BE-11,
// redacted server-side) — a null renders masked, never as an error.
export default function CreatePurchaseOrderScreen() {
  const { color, type: typeScale, radius, border } = useTheme();
  const router = useRouter();
  const { token } = useAuth();

  const [suppliers, setSuppliers] = useState<SupplierResponse[]>([]);
  const [approvedPrs, setApprovedPrs] = useState<PurchaseRequestResponse[]>([]);
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [linkedPrIds, setLinkedPrIds] = useState<string[]>([]);
  const [lines, setLines] = useState<Line[]>([newLine()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<PurchaseOrderResponse | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) return;
    listSuppliers(token).then(setSuppliers).catch(() => setSuppliers([]));
    listPurchaseRequests(token)
      .then((all) => setApprovedPrs(all.filter((pr) => pr.status === 'APPROVED')))
      .catch(() => setApprovedPrs([]));
  }, [token]);

  const togglePr = (id: string) => setLinkedPrIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const updateLine = (key: string, patch: Partial<Line>) => setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const addLine = () => setLines((prev) => [...prev, newLine()]);

  const handleSubmit = async () => {
    setError(null);
    const items = lines
      .filter((l) => l.partId.trim().length > 0)
      .map((l) => ({ partId: l.partId.trim(), quantity: Number(l.quantity), price: Number(l.price) }));

    if (items.length === 0) return setError('Add at least one line.');
    if (items.some((i) => !Number.isFinite(i.quantity) || i.quantity <= 0 || !Number.isFinite(i.price) || i.price <= 0)) {
      return setError('Every line needs a quantity and price greater than zero.');
    }
    if (!token) return setError('Not signed in.');

    setSubmitting(true);
    try {
      const response = await createPurchaseOrder(
        { supplierId: supplierId ?? undefined, purchaseRequestIds: linkedPrIds.length ? linkedPrIds : undefined, items },
        token,
      );
      setCreated(response);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create this purchase order.');
    } finally {
      setSubmitting(false);
    }
  };

  const runAction = async (fn: () => Promise<PurchaseOrderResponse>) => {
    setActionError(null);
    setBusy(true);
    try {
      setCreated(await fn());
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Action failed.');
    } finally {
      setBusy(false);
    }
  };

  if (created) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: color.surface }}>
        <ScrollView contentContainerClassName="gap-md px-xl pt-xl pb-xl">
          <Text style={{ ...textStyle(typeScale.heading), color: color.ink }}>{created.poNumber}</Text>
          <Chip label={created.status} tone={created.status === 'CANCELLED' ? 'danger' : 'neutral'} solid />
          <Text style={{ ...textStyle(typeScale.helper), color: color.mute }}>
            Also reachable: draft · ordered · partially_received · received · cancelled
          </Text>
          <KV k="Order date" v={created.orderDate ?? '—'} derived />

          {created.items.map((item) => (
            <Card key={item.id}>
              <Row>
                <Text style={{ ...textStyle(typeScale.body), color: color.ink }}>{item.partName}</Text>
                <Text style={{ ...textStyle(typeScale.value), color: color.steel }}>{item.quantity}</Text>
              </Row>
              {item.price != null ? (
                <Text style={{ ...textStyle(typeScale.value), color: color.ink, marginTop: 4 }}>{rp(item.price)}</Text>
              ) : (
                <Text style={{ ...textStyle(typeScale.helper), color: color.mute, marginTop: 4 }}>Price hidden below Owner scope</Text>
              )}
            </Card>
          ))}

          {created.totalAmount != null ? (
            <Card>
              <Text style={{ ...textStyle(typeScale.fieldLabel), color: color.mute }}>Total</Text>
              <Text style={{ ...textStyle(typeScale.valueLarge), color: color.ink }}>{rp(created.totalAmount)}</Text>
            </Card>
          ) : null}

          {actionError ? <Callout tone="danger">{actionError}</Callout> : null}

          <Row>
            <View style={{ flex: 1 }}>
              <Button label="Send to supplier" variant="secondary" disabled={busy} onPress={() => runAction(() => sendPurchaseOrder(created.id, token!))} />
            </View>
            <View style={{ flex: 1 }}>
              <Button label="Cancel" variant="secondary" disabled={busy} onPress={() => runAction(() => cancelPurchaseOrder(created.id, token!))} />
            </View>
          </Row>
          <Callout tone="warning">
            Neither action has a scope check today, so both stay plain — including "send to supplier," arguably as
            consequential as a PRA authorization.
          </Callout>

          <Button label="Back to Procurement" onPress={() => router.replace('/(app)/procurement')} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.surface }}>
      <ScrollView contentContainerClassName="gap-md px-xl pt-xl pb-xl">
        <Text style={{ ...textStyle(typeScale.screenTitle), color: color.ink }}>New Purchase Order</Text>
        <Callout>Outlet-to-centre restock — the franchise leg, running parallel to PRA/Realisasi. Not a marketplace purchase.</Callout>

        <Section>Supplier (legacy, optional)</Section>
        {suppliers.map((s) => (
          <Pressable
            key={s.id}
            onPress={() => setSupplierId(supplierId === s.id ? null : s.id)}
            style={{
              borderWidth: border.base,
              borderColor: supplierId === s.id ? color.ink : color.hair,
              borderRadius: radius.sm,
              padding: 10,
              backgroundColor: color.panel,
            }}
          >
            <Text style={{ ...textStyle(typeScale.body), color: color.ink }}>{s.name}</Text>
          </Pressable>
        ))}
        <Callout>
          Supplier on this path predates the split. New code shouldn't rely on a PO carrying a real external
          supplier — that role moved to Realisasi.
        </Callout>

        <Field label="Order date" value="Set to today when created" variant="derived" />

        <Section>From purchase requests (optional)</Section>
        {approvedPrs.map((pr) => (
          <Pressable
            key={pr.id}
            onPress={() => togglePr(pr.id)}
            style={{
              borderWidth: border.base,
              borderColor: linkedPrIds.includes(pr.id) ? color.ink : color.hair,
              borderRadius: radius.sm,
              padding: 10,
              backgroundColor: color.panel,
            }}
          >
            <Text style={{ ...textStyle(typeScale.value), color: color.ink }}>{pr.id}</Text>
          </Pressable>
        ))}
        <Callout>Every linked PR must already be APPROVED — the API refuses otherwise.</Callout>

        <Section>Items</Section>
        {lines.map((line) => (
          <Card key={line.key}>
            <Field label="Part" value={line.partId} onChangeText={(v) => updateLine(line.key, { partId: v })} placeholder="Part ID" />
            <View style={{ marginTop: 9 }}>
              <Row>
                <Field label="Qty" value={line.quantity} onChangeText={(v) => updateLine(line.key, { quantity: v })} mono keyboardType="numeric" />
                <Field label="Price" value={line.price} onChangeText={(v) => updateLine(line.key, { price: v })} mono keyboardType="numeric" />
              </Row>
            </View>
          </Card>
        ))}
        <Button label="+ Add line" variant="secondary" onPress={addLine} />
        <Callout>Flat price only. No cost components, no landed cost, no conversion factor on this path.</Callout>
        <Callout tone="warning">
          Total and per-line price only show once created, and only to Owner+ — below that scope the API returns
          them empty.
        </Callout>

        {error ? <Text style={{ ...textStyle(typeScale.helper), color: color.danger }}>{error}</Text> : null}

        <Button label={submitting ? 'Creating…' : 'Create (draft)'} onPress={handleSubmit} disabled={submitting} />
      </ScrollView>
    </SafeAreaView>
  );
}
