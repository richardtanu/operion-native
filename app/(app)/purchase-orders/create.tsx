import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Callout, Card, Chip, Field, KV, Row, Section, SelectField } from '../../../components';
import { useAuth } from '../../../auth/AuthContext';
import { canDraftOrder, ownerPlus as isOwnerPlus } from '../../../auth/permissions';
import { cancelPurchaseOrder, createPurchaseOrder, getCatalog, listPurchaseRequests, sendPurchaseOrder } from '../../../api/procurement';
import { ApiError } from '../../../api/httpError';
import type { CatalogItemResponse, PurchaseOrderResponse, PurchaseRequestResponse } from '../../../api/types';
import { useTheme } from '../../../theme/ThemeContext';
import { textStyle } from '../../../theme/typeStyle';
import { rp } from '../../../lib/money';
import { decodeLines } from '../../../lib/stockLevel';


type Line = { key: string; catalogId: string; quantity: string };

let lineKeySeq = 0;
function newLine(): Line {
  lineKeySeq += 1;
  return { key: `line-${lineKeySeq}`, catalogId: '', quantity: '' };
}

// PROC-07 — Order from HQ (BE-20, BE-21). The store orders from HQ's catalog
// only; HQ is always the supplier, set by the server. The store decides when
// and how much. Draft: MANAGER+ or PROCUREMENT. Send to HQ commits the store's
// money: OWNER+. Cancel: a draft by its creator or OWNER+; once sent, OWNER+
// with a reason. Prices are HQ's (BE-28): taken when the order is created and
// again when it's sent, never typed by the store. Prices and the total come
// back null below Owner (BE-11).
// Restock (INV-02) opens it with `lines=catalogId:qty,…` filled in.
export default function CreatePurchaseOrderScreen() {
  const { color, type: typeScale, radius, border } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ lines?: string }>();
  const { user, token } = useAuth();

  const [catalog, setCatalog] = useState<CatalogItemResponse[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [approvedPrs, setApprovedPrs] = useState<PurchaseRequestResponse[]>([]);
  const [linkedPrIds, setLinkedPrIds] = useState<string[]>([]);
  const [lines, setLines] = useState<Line[]>([newLine()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<PurchaseOrderResponse | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const mayDraft = canDraftOrder(user);
  const ownerPlus = isOwnerPlus(user);

  useEffect(() => {
    if (!token) return;
    getCatalog(token)
      .then((items) => {
        setCatalog(items);
        const prefill = decodeLines(params.lines).filter((l) => items.some((c) => c.id === l.partId));
        if (prefill.length) setLines(prefill.map((l) => ({ ...newLine(), catalogId: l.partId, quantity: l.quantity })));
      })
      .catch(() => setCatalog([]))
      .finally(() => setCatalogLoading(false));
    listPurchaseRequests(token)
      .then((all) => setApprovedPrs(all.filter((pr) => pr.status === 'APPROVED')))
      .catch(() => setApprovedPrs([]));
  }, [token, params.lines]);

  const togglePr = (id: string) => setLinkedPrIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const updateLine = (key: string, patch: Partial<Line>) => setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const addLine = () => setLines((prev) => [...prev, newLine()]);
  const removeLine = (key: string) => setLines((prev) => prev.filter((l) => l.key !== key));
  // What the lines cost at HQ's current prices; null until every picked line has a price and a quantity.
  const picked = lines.filter((l) => l.catalogId);
  const estimate = picked.length && picked.every((l) => catalog.find((c) => c.id === l.catalogId)?.price != null && Number(l.quantity) > 0)
    ? picked.reduce((sum, l) => sum + catalog.find((c) => c.id === l.catalogId)!.price! * Number(l.quantity), 0)
    : null;

  const handleSubmit = async () => {
    setError(null);
    const items = lines
      .filter((l) => l.catalogId)
      .map((l) => ({ partId: l.catalogId, quantity: Number(l.quantity) }));

    if (items.length === 0) return setError('Add at least one item from the HQ catalog.');
    if (items.some((i) => !Number.isInteger(i.quantity) || i.quantity <= 0)) {
      return setError('Every line needs a whole quantity greater than zero.');
    }
    if (!token) return setError('Not signed in.');

    setSubmitting(true);
    try {
      setCreated(await createPurchaseOrder({ purchaseRequestIds: linkedPrIds.length ? linkedPrIds : undefined, items }, token));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create this order.');
    } finally {
      setSubmitting(false);
    }
  };

  const runAction = async (fn: () => Promise<PurchaseOrderResponse>) => {
    setActionError(null);
    setBusy(true);
    try {
      setCreated(await fn());
      setCancelReason('');
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Action failed.');
    } finally {
      setBusy(false);
    }
  };

  if (created) {
    const isDraft = created.status === 'DRAFT';
    const isSent = created.status === 'ORDERED' || created.status === 'PARTIALLY_RECEIVED';
    const isCreator = created.createdById === user?.id;
    const mayCancel = isDraft ? isCreator || ownerPlus : isSent && ownerPlus;
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: color.surface }}>
        <ScrollView contentContainerClassName="gap-md px-xl pt-xl pb-xl">
          <Text style={{ ...textStyle(typeScale.heading), color: color.ink }}>{created.poNumber}</Text>
          <Chip label={created.status} tone={created.status === 'CANCELLED' ? 'danger' : 'neutral'} solid />
          <Text style={{ ...textStyle(typeScale.helper), color: color.mute }}>
            Also reachable: draft · ordered · partially_received · received · cancelled
          </Text>
          <Card>
            <KV k="From" v={created.supplierName ?? 'HQ'} />
            <KV k="Order date" v={created.orderDate ?? '—'} derived />
            <KV k="Drafted by" v={created.createdByName ?? 'Not recorded'} derived={!created.createdByName} />
          </Card>

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

          {isDraft ? (
            <>
              <Button
                label="Send to HQ"
                variant="gated"
                gate="OWNER+"
                disabled={busy || !ownerPlus}
                onPress={() => runAction(() => sendPurchaseOrder(created.id, token!))}
              />
              <Text style={{ ...textStyle(typeScale.helper), color: color.steel }}>
                Sending commits the store's money, so the store Owner sends it.
              </Text>
            </>
          ) : null}

          {isSent ? (
            <Field label="Reason (required to cancel a sent order)" value={cancelReason} onChangeText={setCancelReason} placeholder="e.g. HQ is out of stock" />
          ) : null}
          {isDraft || isSent ? (
            <Button
              label="Cancel order"
              variant="gated"
              gate={isDraft ? 'CREATOR·OWNER+' : 'OWNER+'}
              disabled={busy || !mayCancel || (isSent && !cancelReason.trim())}
              onPress={() =>
                runAction(() => cancelPurchaseOrder(created.id, cancelReason.trim() ? { reason: cancelReason.trim() } : {}, token!))
              }
            />
          ) : null}

          <Button label="Back to Procurement" onPress={() => router.replace('/(app)/procurement')} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.surface }}>
      <ScrollView contentContainerClassName="gap-md px-xl pt-xl pb-xl">
        <Text style={{ ...textStyle(typeScale.screenTitle), color: color.ink }}>Order from HQ</Text>
        <Callout>
          Restock from HQ, on your store's own timing. Mandatory items (BB, gas, targets, gel balls) can only come from
          here; anything else HQ sells can come from here too.
        </Callout>

        <Field label="Order date" value="Set to today when created" variant="derived" />

        {approvedPrs.length > 0 ? (
          <>
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
                <Text style={{ ...textStyle(typeScale.body), color: color.ink }}>
                  {pr.items.map((i) => `${i.partName} × ${i.quantity}`).join(', ')}
                </Text>
                <Text style={{ ...textStyle(typeScale.helper), color: color.steel }}>
                  requested by {pr.requestedByName} · {pr.tenantName}
                </Text>
              </Pressable>
            ))}
          </>
        ) : null}

        <Section>Items</Section>
        {lines.map((line) => {
          const item = catalog.find((c) => c.id === line.catalogId);
          return (
            <Card key={line.key}>
              <SelectField
                label="Item from HQ"
                value={line.catalogId || null}
                loading={catalogLoading}
                placeholder="Pick from HQ's catalog…"
                items={catalog.map((c) => ({
                  id: c.id,
                  label: c.name,
                  sublabel: [
                    c.mandatoryFromHq ? 'Mandatory' : null,
                    c.price != null ? rp(c.price) : null,
                    c.storeCurrentStock != null ? `${c.storeCurrentStock} in stock here` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ') || undefined,
                  group: c.categoryName ?? 'Other',
                }))}
                onChange={(id) => updateLine(line.key, { catalogId: id })}
              />
              {item?.mandatoryFromHq ? (
                <View style={{ marginTop: 6 }}>
                  <Chip label="Mandatory from HQ" tone="warning" />
                </View>
              ) : null}
              <View style={{ marginTop: 9 }}>
                <Row>
                  <Field label="Qty" value={line.quantity} onChangeText={(v) => updateLine(line.key, { quantity: v })} mono keyboardType="numeric" />
                  <Field
                    label="HQ's price"
                    value={item ? (item.price != null ? rp(item.price) : ownerPlus ? 'Not set by HQ yet' : 'Set by HQ') : '—'}
                    variant="derived"
                    mono={item?.price != null}
                  />
                </Row>
              </View>
              {lines.length > 1 ? (
                <View style={{ marginTop: 8 }}>
                  <Button label="Remove line" variant="secondary" onPress={() => removeLine(line.key)} />
                </View>
              ) : null}
            </Card>
          );
        })}
        <Button label="+ Add line" variant="secondary" onPress={addLine} />
        {!catalogLoading && catalog.length === 0 ? (
          <Callout tone="warning">HQ's catalog is empty. HQ marks the items it sells before stores can order them.</Callout>
        ) : null}
        {ownerPlus && estimate != null ? <KV k="At HQ's prices now" v={rp(estimate)} strong derived /> : null}
        <Callout>
          HQ sets the prices. The order takes HQ's price when it's created and again when the Owner sends it; after
          that it doesn't change. Prices show to the Owner and above only.
        </Callout>

        {!mayDraft ? (
          <Callout tone="warning" title="Not available for your account">
            Orders to HQ are drafted by the Store Manager (Manager scope or above) or HQ Procurement.
          </Callout>
        ) : null}
        {error ? <Text style={{ ...textStyle(typeScale.helper), color: color.danger }}>{error}</Text> : null}

        <Button
          label={submitting ? 'Creating…' : 'Create (draft)'}
          variant="gated"
          gate="MANAGER+·PROC"
          onPress={handleSubmit}
          disabled={submitting || !mayDraft}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
