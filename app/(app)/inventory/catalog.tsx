import { useCallback, useState } from 'react';
import { Link, useFocusEffect } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Callout, Card, Chip, Field, FieldLabel, KV, Row, Section, SelectField } from '../../../components';
import { useAuth } from '../../../auth/AuthContext';
import { canManageHqCatalog } from '../../../auth/permissions';
import { linkToCatalog, listParts, updateHqFlags } from '../../../api/parts';
import { getTenantTree } from '../../../api/tenants';
import { ApiError } from '../../../api/httpError';
import type { PartResponse, TenantResponse } from '../../../api/types';
import { useTheme } from '../../../theme/ThemeContext';
import { textStyle } from '../../../theme/typeStyle';
import { rp } from '../../../lib/money';


// INV-09 — HQ catalog (HQ). HQ's own items are the catalog: which ones HQ
// sells, which stores must buy from HQ, HQ's price (BE-28: selling needs one;
// orders take it), and which store item is the same as each HQ item. Flags,
// prices and links are HQ admins' (ADMIN role or PRINCIPAL scope, signed in
// at HQ); a store's Manager+ can also create a link from their own Items
// screen, but only HQ changes or removes one.
export default function HqCatalogScreen() {
  const { color, type: typeScale } = useTheme();
  const { user, token } = useAuth();
  const [tree, setTree] = useState<TenantResponse[]>([]);
  const [parts, setParts] = useState<PartResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [sold, setSold] = useState(false);
  const [mustBuy, setMustBuy] = useState(false);
  const [price, setPrice] = useState('');
  const [linkPick, setLinkPick] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const root = tree[0] && tree[0].parentId == null ? tree[0] : null;
  const stores = tree.filter((t) => t.id !== root?.id);
  const mayManage = canManageHqCatalog(user, !!root);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [t, p] = await Promise.all([getTenantTree(token), listParts(token)]);
      setTree(t);
      setParts(p);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load the catalog.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const hqItems = parts.filter((p) => p.tenantId === root?.id && !p.retired).sort((a, b) => a.name.localeCompare(b.name));
  const linkedIn = (itemId: string) => parts.filter((p) => p.catalogPartId === itemId && p.tenantId !== root?.id);

  const open = (item: PartResponse) => {
    if (openId === item.id) return setOpenId(null);
    setOpenId(item.id);
    setSold(item.soldByHq);
    setMustBuy(item.mandatoryFromHq);
    setPrice(item.hqPrice != null ? String(item.hqPrice) : '');
    setNotice(null);
  };

  const run = async (fn: () => Promise<unknown>, done: string, failed: string) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      setNotice(done);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : failed);
    } finally {
      setBusy(false);
    }
  };

  const save = (item: PartResponse) => {
    if (!token) return;
    const t = price.replace(/[^\d.]/g, '');
    const value = t === '' ? undefined : Number(t);
    if (value !== undefined && (!Number.isFinite(value) || value <= 0)) return setError('The price must be more than 0.');
    if ((sold || mustBuy) && value === undefined) return setError("Set HQ's price before selling this item.");
    run(
      () => updateHqFlags(item.id, { soldByHq: sold || mustBuy, mandatoryFromHq: mustBuy, ...(value !== undefined ? { price: value } : {}) }, token),
      `Saved ${item.name}.`,
      'Could not save this item.',
    );
  };

  if (!loading && !root) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: color.surface }}>
        <View className="flex-1 gap-md px-xl pt-xl">
          <Text style={{ ...textStyle(typeScale.screenTitle), color: color.ink }}>HQ catalog</Text>
          <Callout>HQ manages its catalog when signed in at HQ. Stores see what HQ sells in Order from HQ.</Callout>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.surface }}>
      <ScrollView contentContainerClassName="gap-md px-xl pt-xl pb-xl">
        <Text style={{ ...textStyle(typeScale.screenTitle), color: color.ink }}>HQ catalog</Text>

        {mayManage ? (
          <Link href="/(app)/inventory/item-form" asChild>
            <Button label="Add HQ item" variant="gated" gate="HQ ADMIN" />
          </Link>
        ) : (
          <Callout>Only HQ admins change the catalog.</Callout>
        )}

        {error ? <Callout tone="danger">{error}</Callout> : null}
        {notice ? <Callout tone="success">{notice}</Callout> : null}
        {loading ? <Text style={{ ...textStyle(typeScale.body), color: color.steel }}>Loading…</Text> : null}
        {!loading && hqItems.length === 0 ? (
          <Text style={{ ...textStyle(typeScale.body), color: color.mute }}>HQ has no items yet.</Text>
        ) : null}

        {hqItems.map((item) => {
          const linked = linkedIn(item.id);
          const isOpen = openId === item.id;
          return (
            <Card key={item.id}>
              <Pressable onPress={() => mayManage && open(item)} disabled={!mayManage}>
                <View className="flex-row items-start justify-between" style={{ gap: 8 }}>
                  <Text style={{ ...textStyle(typeScale.cardTitle), color: color.ink, flex: 1 }}>{item.name}</Text>
                  <Row gap={6}>
                    {item.soldByHq ? <Chip label="Sold" tone="success" /> : <Chip label="Not sold" />}
                    {item.mandatoryFromHq ? <Chip label="Must buy" tone="warning" /> : null}
                  </Row>
                </View>
                <KV k="Price" v={item.hqPrice != null ? rp(item.hqPrice) : '—'} />
                <KV k="Stores linked" v={`${new Set(linked.map((p) => p.tenantId)).size} of ${stores.length}`} />
                {item.soldByHq && item.hqPrice == null ? (
                  <Text style={{ ...textStyle(typeScale.helper), color: color.warn }}>No price: stores can't order it until HQ sets one.</Text>
                ) : null}
              </Pressable>

              {isOpen ? (
                <View style={{ gap: 9, marginTop: 10 }}>
                  <View style={{ gap: 6 }}>
                    <FieldLabel>Sold by HQ</FieldLabel>
                    <Row gap={0}>
                      {[true, false].map((v) => (
                        <View key={String(v)} style={{ flex: 1 }}>
                          <Button label={v ? 'Yes' : 'No'} variant={(sold || mustBuy) === v ? 'primary' : 'secondary'} onPress={() => setSold(v)} disabled={!v && mustBuy} />
                        </View>
                      ))}
                    </Row>
                  </View>
                  <View style={{ gap: 6 }}>
                    <FieldLabel>Stores must buy from HQ</FieldLabel>
                    <Row gap={0}>
                      {[true, false].map((v) => (
                        <View key={String(v)} style={{ flex: 1 }}>
                          <Button label={v ? 'Yes' : 'No'} variant={mustBuy === v ? 'primary' : 'secondary'} onPress={() => setMustBuy(v)} />
                        </View>
                      ))}
                    </Row>
                  </View>
                  <Field
                    label="HQ's price (Rp)"
                    value={price}
                    onChangeText={setPrice}
                    mono
                    keyboardType="numeric"
                    sub="What stores pay per unit. Only Owners and above see it. Orders take it when created and when sent."
                  />
                  <Button label={busy ? 'Saving…' : 'Save'} variant="gated" gate="HQ ADMIN" disabled={busy} onPress={() => save(item)} />

                  <Section>Store items</Section>
                  {stores.map((store) => {
                    const mine = linked.find((p) => p.tenantId === store.id);
                    const candidates = parts.filter((p) => p.tenantId === store.id && !p.catalogPartId && !p.retired);
                    return (
                      <View key={store.id} style={{ gap: 6 }}>
                        <View className="flex-row justify-between" style={{ gap: 8 }}>
                          <Text style={{ ...textStyle(typeScale.body), color: color.ink, flex: 1 }}>{store.name}</Text>
                          {mine ? <Chip label="Linked" tone="success" /> : <Chip label="Not linked" />}
                        </View>
                        {mine ? (
                          <>
                            <Text style={{ ...textStyle(typeScale.helper), color: color.steel }}>{mine.name}</Text>
                            <Button
                              label="Unlink"
                              variant="gated"
                              gate="HQ ADMIN"
                              disabled={busy}
                              onPress={() => run(() => linkToCatalog(mine.id, null, token!), `Unlinked ${store.name}'s item.`, 'Could not unlink.')}
                              style={{ paddingVertical: 8 }}
                            />
                          </>
                        ) : (
                          <>
                            <SelectField
                              label="Their item"
                              value={linkPick[store.id] ?? null}
                              placeholder={candidates.length ? 'Pick their item…' : 'No unlinked items'}
                              disabled={candidates.length === 0}
                              items={candidates.map((p) => ({ id: p.id, label: p.name, sublabel: p.categoryName ?? undefined }))}
                              onChange={(id) => setLinkPick((prev) => ({ ...prev, [store.id]: id }))}
                            />
                            <Button
                              label="Link"
                              variant="gated"
                              gate="HQ ADMIN"
                              disabled={busy || !linkPick[store.id]}
                              onPress={() =>
                                run(() => linkToCatalog(linkPick[store.id], item.id, token!), `Linked ${store.name}'s item.`, 'Could not link.')
                              }
                              style={{ paddingVertical: 8 }}
                            />
                          </>
                        )}
                      </View>
                    );
                  })}
                </View>
              ) : null}
            </Card>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
