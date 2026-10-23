import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Callout, Field, KV, Row, Section, SelectField } from '../../../components';
import { useAuth } from '../../../auth/AuthContext';
import { canDraftOrder, canEditItems, canLinkToCatalog, canRetireItems } from '../../../auth/permissions';
import { createPart, linkToCatalog, listCategories, listPartTypes, listParts, retirePart, updatePart } from '../../../api/parts';
import { getCatalog } from '../../../api/procurement';
import { ApiError } from '../../../api/httpError';
import type { CatalogItemResponse, PartCategoryResponse, PartResponse, PartTypeResponse } from '../../../api/types';
import { useTheme } from '../../../theme/ThemeContext';
import { textStyle } from '../../../theme/typeStyle';
import { encodeLines } from '../../../lib/stockLevel';


const optionalInt = (text: string): number | undefined | null => {
  const t = text.trim();
  if (t === '') return undefined;
  const n = Number(t);
  return Number.isInteger(n) && n >= 0 ? n : null;
};

// INV-06 — Add or edit an item, link it to the item HQ sells, retire it.
// BE-25: add/edit is the store's MANAGER+ or ADMIN; retire is OWNER+ or
// ADMIN. Linking: the store's MANAGER+ may link an unlinked item to an item
// HQ sells, once; changing or removing a link is HQ's. While adding, a name
// HQ already sells suggests ordering it from HQ instead, so stock and orders
// stay on one item. Opened with `partId` to edit.
export default function ItemFormScreen() {
  const { color, type: typeScale } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ partId?: string }>();
  const { user, token } = useAuth();
  const editingId = params.partId ?? null;

  const [part, setPart] = useState<PartResponse | null>(null);
  const [categories, setCategories] = useState<PartCategoryResponse[]>([]);
  const [types, setTypes] = useState<PartTypeResponse[]>([]);
  const [catalog, setCatalog] = useState<CatalogItemResponse[]>([]);

  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [partTypeId, setPartTypeId] = useState<string | null>(null);
  const [minimum, setMinimum] = useState('');
  const [reorderQty, setReorderQty] = useState('');
  const [lifespan, setLifespan] = useState('');
  const [notes, setNotes] = useState('');

  const [linkTo, setLinkTo] = useState<string | null>(null);
  const [retireReason, setRetireReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    listCategories(token)
      .then(setCategories)
      .catch(() => setCategories([]));
    getCatalog(token)
      .then(setCatalog)
      .catch(() => setCatalog([]));
    if (editingId) {
      listParts(token)
        .then((all) => {
          const found = all.find((p) => p.id === editingId) ?? null;
          setPart(found);
          if (!found) return setError('This item no longer exists.');
          setName(found.name);
          setBrand(found.brand ?? '');
          setCategoryId(found.categoryId);
          setPartTypeId(found.partTypeId);
          setMinimum(found.minimumStock != null ? String(found.minimumStock) : '');
          setReorderQty(found.reorderQuantity != null ? String(found.reorderQuantity) : '');
          setLifespan(found.expectedLifespanDays != null ? String(found.expectedLifespanDays) : '');
          setNotes(found.notes ?? '');
        })
        .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load this item.'));
    }
  }, [token, editingId]);

  useEffect(() => {
    if (!token || !categoryId) return setTypes([]);
    listPartTypes(categoryId, token)
      .then(setTypes)
      .catch(() => setTypes([]));
  }, [token, categoryId]);

  const q = name.trim().toLowerCase();
  const hqMatch = !editingId && q.length >= 3 ? catalog.find((c) => c.name.toLowerCase() === q || (q.length >= 4 && c.name.toLowerCase().includes(q))) : undefined;
  const linkable = catalog.filter((c) => c.storePartId == null);

  const run = async (fn: () => Promise<void>, failed: string) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : failed);
    } finally {
      setBusy(false);
    }
  };

  const save = () => {
    if (!token) return;
    const minimumStock = optionalInt(minimum);
    const reorderQuantity = optionalInt(reorderQty);
    const lifespanDays = optionalInt(lifespan);
    if (!name.trim()) return setError('Give the item a name.');
    if (!categoryId || !partTypeId) return setError('Pick a category and a type.');
    if (minimumStock === null || reorderQuantity === null || lifespanDays === null) return setError('Numbers must be whole and 0 or more.');
    if (lifespanDays === 0) return setError('Expected lifespan must be at least 1 day, or empty.');

    run(async () => {
      if (part) {
        const categoryChanged = categoryId !== part.categoryId || partTypeId !== part.partTypeId;
        await updatePart(
          part.id,
          {
            name: name.trim(),
            manufacturer: brand.trim() || undefined,
            ...(categoryChanged ? { categoryId, partTypeId } : {}),
            expectedLifespan: lifespanDays,
            minimumStock,
            reorderQuantity,
            notes: notes.trim() || undefined,
          },
          token,
        );
        router.back();
      } else {
        const created = await createPart(
          {
            name: name.trim(),
            brand: brand.trim() || undefined,
            categoryId,
            partTypeId,
            expectedLifespanDays: lifespanDays,
            minimumStock,
            reorderQuantity,
            notes: notes.trim() || undefined,
          },
          token,
        );
        router.replace({ pathname: '/(app)/inventory/item/[partId]', params: { partId: created.id } });
      }
    }, 'Could not save the item.');
  };

  const link = () => {
    if (!token || !part || !linkTo) return;
    run(async () => {
      const updated = await linkToCatalog(part.id, linkTo, token);
      setPart(updated);
      setNotice('Linked. Orders from HQ now add to this item. Only HQ can change the link.');
    }, 'Could not link this item.');
  };

  const retire = () => {
    if (!token || !part || !retireReason.trim()) return;
    run(async () => {
      await retirePart(part.id, retireReason.trim(), token);
      router.back();
    }, 'Could not retire this item.');
  };

  const hqLinked = part?.catalogPartId ? catalog.find((c) => c.id === part.catalogPartId) : undefined;
  const category = categories.find((c) => c.id === categoryId);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.surface }}>
      <ScrollView contentContainerClassName="gap-md px-xl pt-xl pb-xl">
        <Text style={{ ...textStyle(typeScale.screenTitle), color: color.ink }}>{editingId ? 'Edit item' : 'Add item'}</Text>

        <Field label="Name" value={name} onChangeText={setName} placeholder="e.g. Spring M130" />
        {hqMatch ? (
          hqMatch.storePartId ? (
            <Callout tone="neutral">{`You already stock HQ's “${hqMatch.name}”. Find it in Items instead of adding a second one.`}</Callout>
          ) : (
            <View className="gap-sm">
              <Callout tone="neutral">{`HQ sells “${hqMatch.name}”. Order it from HQ instead of adding your own, so stock and orders stay on one item.`}</Callout>
              <Button
                label="Order from HQ instead"
                variant="gated"
                gate="MANAGER+·PROC"
                disabled={!canDraftOrder(user)}
                onPress={() => router.replace({ pathname: '/(app)/purchase-orders/create', params: { lines: encodeLines([{ partId: hqMatch.id, quantity: null }]) } })}
              />
            </View>
          )
        ) : null}
        <Field label="Brand" value={brand} onChangeText={setBrand} placeholder="Optional" />
        <SelectField
          label="Category"
          value={categoryId}
          placeholder="Select category…"
          items={categories.map((c) => ({ id: c.id, label: c.name, sublabel: c.consumable ? 'Counted by quantity' : 'Counted one by one' }))}
          onChange={(id) => {
            setCategoryId(id);
            setPartTypeId(null);
          }}
        />
        <SelectField
          label="Type"
          value={partTypeId}
          placeholder={categoryId ? 'Select type…' : 'Pick a category first'}
          disabled={!categoryId}
          items={types.map((t) => ({ id: t.id, label: t.name }))}
          onChange={setPartTypeId}
        />
        {category ? (
          <Text style={{ ...textStyle(typeScale.helper), color: color.mute }}>
            {category.consumable ? 'Counted by quantity, like BBs and gas.' : 'Counted one by one: each unit gets its own record.'}
          </Text>
        ) : null}
        <Row>
          <Field label="Minimum" value={minimum} onChangeText={setMinimum} mono keyboardType="numeric" placeholder="0" />
          <Field label="Reorder qty" value={reorderQty} onChangeText={setReorderQty} mono keyboardType="numeric" placeholder="0" />
        </Row>
        <Field label="Expected lifespan (days)" value={lifespan} onChangeText={setLifespan} mono keyboardType="numeric" placeholder="Optional" />
        <Field label="Notes" value={notes} onChangeText={setNotes} placeholder="Optional" />
        <Text style={{ ...textStyle(typeScale.helper), color: color.mute }}>
          Without usage data, minimum stock decides when this item counts as low.
        </Text>

        {error ? <Callout tone="danger">{error}</Callout> : null}
        {notice ? <Callout tone="success">{notice}</Callout> : null}

        <Button
          label={busy ? 'Saving…' : 'Save item'}
          variant="gated"
          gate="MANAGER+·ADMIN"
          disabled={busy || !canEditItems(user) || (!!editingId && !part)}
          onPress={save}
        />

        {part ? (
          <>
            <Section>HQ catalog</Section>
            {part.catalogPartId ? (
              <>
                <KV k="Same as" v={`${hqLinked?.name ?? 'An HQ item'} (HQ)`} />
                <Text style={{ ...textStyle(typeScale.helper), color: color.mute }}>Ask HQ to change or remove this link.</Text>
              </>
            ) : canLinkToCatalog(user) ? (
              <View className="gap-sm">
                <SelectField
                  label="Same as HQ's item"
                  value={linkTo}
                  placeholder={linkable.length ? 'Select HQ item…' : 'Nothing left to link'}
                  disabled={linkable.length === 0}
                  items={linkable.map((c) => ({ id: c.id, label: c.name, sublabel: c.mandatoryFromHq ? 'Must buy from HQ' : undefined }))}
                  onChange={setLinkTo}
                />
                <Text style={{ ...textStyle(typeScale.helper), color: color.mute }}>
                  Once linked, orders from HQ add to this item, and only HQ can change or remove the link.
                </Text>
                <Button label="Link" variant="gated" gate="MANAGER+" disabled={busy || !linkTo} onPress={link} />
              </View>
            ) : (
              <Text style={{ ...textStyle(typeScale.helper), color: color.steel }}>Not linked to an item HQ sells.</Text>
            )}

            {canRetireItems(user) && !part.retired ? (
              <>
                <Section>Retire</Section>
                <Field label="Reason" value={retireReason} onChangeText={setRetireReason} placeholder="e.g. no longer stocked" />
                <Text style={{ ...textStyle(typeScale.helper), color: color.mute }}>Only when stock is 0 and nothing is installed.</Text>
                <Button label="Retire item" variant="gated" gate="OWNER+·ADMIN" disabled={busy || !retireReason.trim()} onPress={retire} />
              </>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
