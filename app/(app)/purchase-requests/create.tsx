import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { X } from 'lucide-react-native';
import { Button, Callout, Card, Chip, Field, Row, Screen, Section, SelectField, Tap } from '../../../components';
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
import { requestCode } from '../../../lib/requestCode';


type Line = { key: string; categoryId: string; partId: string; partName: string; quantity: string };

let lineKeySeq = 0;
function newLine(): Line {
  lineKeySeq += 1;
  return { key: `line-${lineKeySeq}`, categoryId: '', partId: '', partName: '', quantity: '' };
}

/** Items with no category are picked under this one, so none are unreachable. */
const NO_CATEGORY = '__none__';
const categoryOf = (p: PartResponse) => p.categoryId ?? NO_CATEGORY;

// PROC-01 — Purchase Request Create. Blocking-error, manual-retry: calls
// api/procurement.ts directly, never through the outbox. BE-14: only
// MANAGER+ or ADMIN / PROCUREMENT may file; HQ picks the store (required, no
// default), a Store Manager's store is fixed; HQ only sees the picked
// store's items (BE-26). Restock (INV-02), Stock (INV-01) and Stock across
// stores (INV-03) open it with `lines=partId:qty,…` and, from HQ, `storeId`.
// Each line picks a category first, then a part from it in a searchable
// list (15 Nov 2026); the part and quantity appear once a category is picked.
export default function CreatePurchaseRequestScreen() {
  const { color, font, type: typeScale, radius } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ lines?: string; storeId?: string }>();
  const { user, token } = useAuth();
  const [lines, setLines] = useState<Line[]>([newLine()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<PurchaseRequestResponse | null>(null);

  const [stores, setStores] = useState<TenantResponse[]>([]);
  const [storeId, setStoreId] = useState<string | null>(params.storeId ?? null);
  const mayCreate = canCreatePurchaseRequest(user);
  const picksStore = canFileForAnotherStore(user) && stores.length > 1;

  const [allParts, setParts] = useState<PartResponse[]>([]);
  const [partsLoading, setPartsLoading] = useState(true);
  // HQ picks the store first and then sees only that store's items; a Store Manager sees their own.
  const parts = picksStore ? (storeId ? allParts.filter((p) => p.tenantId === storeId) : []) : allParts;

  // Category first, then the part (15 Nov 2026): only categories that hold
  // one of the store's items, each with its item count.
  const categories = [...new Map(parts.map((p) => [categoryOf(p), p.categoryName ?? 'Uncategorised'])).entries()]
    .map(([id, name]) => ({ id, label: name, sublabel: `${parts.filter((p) => categoryOf(p) === id).length} items` }))
    .sort((a, b) => (a.id === NO_CATEGORY ? 1 : b.id === NO_CATEGORY ? -1 : a.label.localeCompare(b.label)));

  const pickStore = (id: string) => {
    setStoreId(id);
    setLines((prev) => {
      const kept = prev
        .filter((l) => !l.partId || allParts.find((p) => p.id === l.partId)?.tenantId === id)
        .map((l) => (l.partId ? l : { ...l, categoryId: '' }));
      return kept.length ? kept : [newLine()];
    });
  };

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
          setLines(
            prefill.map((l) => ({ ...newLine(), categoryId: categoryOf(l.part!), partId: l.part!.id, partName: l.part!.name, quantity: l.quantity })),
          );
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
      <Screen title="Request created">
        <Card>
          <Row>
            <Text style={{ ...textStyle(typeScale.body), color: color.steel }}>Status</Text>
            <Chip label={created.status} tone="pending" />
          </Row>
          <Text style={{ ...textStyle(typeScale.helper), color: color.steel, marginTop: 6 }}>
            {created.items.length} line item(s) · for {created.tenantName}
          </Text>
          <Text style={{ fontFamily: font.monoMedium, fontSize: 14, color: color.ink, marginTop: 6 }}>{requestCode(created)}</Text>
        </Card>
        <Button
          label="Open request"
          variant="secondary"
          onPress={() => router.replace({ pathname: '/(app)/purchase-requests/[requestId]', params: { requestId: created.id } })}
        />
        <Button label="Create another" variant="secondary" onPress={() => setCreated(null)} />
        <Button label="Done" onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen title="New request">

      {picksStore ? (
        <SelectField
          label="Store"
          value={storeId}
          placeholder="Pick the store…"
          items={stores.map((t) => ({ id: t.id, label: t.name, sublabel: t.code }))}
          onChange={pickStore}
        />
      ) : (
        <Field label="Store" value={stores[0]?.name ?? 'Your store'} variant="derived" />
      )}
      <Section>Line items</Section>
      {lines.map((line, index) => (
        <Card key={line.key}>
          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 24 }}>
              <Text style={{ ...textStyle(typeScale.sectionLabel), color: color.steel }}>{`Line ${index + 1}`}</Text>
              {lines.length > 1 ? (
                <Tap
                  onPress={() => removeLine(line.key)}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove line ${index + 1}`}
                  hitSlop={10}
                  style={{ width: 28, height: 28, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: color.derived }}
                  pressedStyle={{ backgroundColor: color.hair }}
                >
                  <X size={16} color={color.steel} />
                </Tap>
              ) : null}
            </View>
            <SelectField
              label="Category"
              value={line.categoryId || null}
              loading={partsLoading}
              placeholder={picksStore && !storeId ? 'Pick the store first' : 'Select category…'}
              items={categories}
              onChange={(id) => {
                if (id === line.categoryId) return;
                // A part from another category no longer fits: pick again.
                updateLine(line.key, { categoryId: id, partId: '', partName: '' });
              }}
            />
            {line.categoryId ? (
              <Row>
                <SelectField
                  label="Part"
                  value={line.partId || null}
                  placeholder="Search or select part…"
                  search
                  items={parts
                    .filter((p) => categoryOf(p) === line.categoryId)
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((p) => ({
                      id: p.id,
                      label: p.name,
                      sublabel: [p.partTypeName, p.brand, `${p.currentStock} in stock`].filter(Boolean).join(' · '),
                    }))}
                  onChange={(id) => {
                    const part = parts.find((p) => p.id === id);
                    if (part) updateLine(line.key, { partId: part.id, partName: part.name });
                  }}
                />
                <View style={{ width: 82 }}>
                  <Field label="Qty" value={line.quantity} onChangeText={(v) => updateLine(line.key, { quantity: v })} placeholder=" " mono keyboardType="numeric" />
                </View>
              </Row>
            ) : null}
          </View>
        </Card>
      ))}
      <Button label="+ Add line" variant="secondary" onPress={addLine} />

      <Field label="Requested by" value={user?.fullName ?? 'you (current user)'} variant="derived" />

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
        label={submitting ? 'Creating…' : 'Create request'}
        variant="gated"
        gate="MANAGER+·ADMIN·PROC"
        onPress={handleSubmit}
        disabled={submitting || !mayCreate}
      />
    </Screen>
  );
}
