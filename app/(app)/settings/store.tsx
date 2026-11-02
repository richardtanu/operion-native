import { useCallback, useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Callout, Card, FieldLabel, Field, KV, Row, Section, SelectField } from '../../../components';
import { useAuth } from '../../../auth/AuthContext';
import { canChangeStoreSettings } from '../../../auth/permissions';
import { getStoreSettings, getTenantTree, updateStoreSettings } from '../../../api/tenants';
import { ApiError } from '../../../api/httpError';
import type { StoreSettingsRequest, StoreSettingsResponse, TenantResponse } from '../../../api/types';
import { useTheme } from '../../../theme/ThemeContext';
import { textStyle } from '../../../theme/typeStyle';


type NumberKey = Exclude<keyof StoreSettingsRequest, 'autoCreateWorkOrder'>;

// What each number means, and the range the server accepts (StoreSettingsRequest.java).
const FIELDS: { key: NumberKey; label: string; sub: string; min: number; max: number; group: 'stock' | 'maintenance' }[] = [
  { key: 'daysOfCoverTarget', label: 'Target days of stock', sub: 'An item is low when it runs out sooner than this.', min: 1, max: 365, group: 'stock' },
  { key: 'burnRateWindowDays', label: 'Usage window (days)', sub: 'How far back usage is averaged.', min: 7, max: 365, group: 'stock' },
  { key: 'burnRateMinObservationDays', label: 'Usage needs at least (days)', sub: 'Days of history before usage counts. Not more than the window.', min: 1, max: 365, group: 'stock' },
  { key: 'burnRateMinEvents', label: 'Usage needs at least (uses)', sub: 'Times an item was used before its usage counts.', min: 1, max: 1000, group: 'stock' },
  { key: 'healthThreshold', label: 'Health needs attention below', sub: '0 to 100.', min: 0, max: 100, group: 'maintenance' },
  { key: 'minimumHealthForOperation', label: 'Unit goes into maintenance below', sub: '0 to 100.', min: 0, max: 100, group: 'maintenance' },
  { key: 'maintenanceIntervalDays', label: 'Service every (days)', sub: 'Since the last maintenance.', min: 1, max: 3650, group: 'maintenance' },
  { key: 'partEndOfLifeWarningDays', label: 'Warn before a part’s end of life (days)', sub: '0 to 365.', min: 0, max: 365, group: 'maintenance' },
  { key: 'maxWornParts', label: 'Most worn parts on a unit', sub: '0 to 100.', min: 0, max: 100, group: 'maintenance' },
  { key: 'maxRefurbishedParts', label: 'Most refurbished parts on a unit', sub: '0 to 100.', min: 0, max: 100, group: 'maintenance' },
  { key: 'maxRemovedParts', label: 'Most removed parts on a unit', sub: '0 to 100.', min: 0, max: 100, group: 'maintenance' },
];

type Draft = Record<NumberKey, string> & { autoCreateWorkOrder: boolean };

const toDraft = (s: StoreSettingsResponse): Draft => ({
  ...(Object.fromEntries(FIELDS.map((f) => [f.key, String(s[f.key])])) as Record<NumberKey, string>),
  autoCreateWorkOrder: s.autoCreateWorkOrder,
});

// Store settings (BE-38): the store's targets for stock and maintenance.
// Anyone at the store, and HQ, reads them; only the store's own Owner,
// signed in at that store, changes them. A store that never saved any uses
// the defaults, shown as values. Only changed values are sent.
export default function StoreSettingsScreen() {
  const { color, type: typeScale } = useTheme();
  const { user, token } = useAuth();
  const [stores, setStores] = useState<TenantResponse[]>([]);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [settings, setSettings] = useState<StoreSettingsResponse | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    getTenantTree(token)
      .then((tree) => {
        setStores(tree);
        setStoreId(tree[0]?.id ?? null);
      })
      .catch(() => setError('Could not load your store.'));
  }, [token]);

  const load = useCallback(async () => {
    if (!token || !storeId) return;
    setLoading(true);
    setError(null);
    try {
      const s = await getStoreSettings(storeId, token);
      setSettings(s);
      setDraft(toDraft(s));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load the settings.');
    } finally {
      setLoading(false);
    }
  }, [token, storeId]);

  useEffect(() => {
    setNotice(null);
    load();
  }, [load]);

  const atOwnStore = !!storeId && storeId === stores[0]?.id;
  const mayChange = canChangeStoreSettings(user, atOwnStore);

  const problems = draft
    ? FIELDS.filter((f) => {
        const n = Number(draft[f.key]);
        return !draft[f.key].trim() || !Number.isInteger(n) || n < f.min || n > f.max;
      }).map((f) => f.key)
    : [];
  const windowTooShort = !!draft && Number(draft.burnRateMinObservationDays) > Number(draft.burnRateWindowDays);

  const changes = (): StoreSettingsRequest => {
    if (!draft || !settings) return {};
    const out: StoreSettingsRequest = {};
    for (const f of FIELDS) if (Number(draft[f.key]) !== settings[f.key]) out[f.key] = Number(draft[f.key]);
    if (draft.autoCreateWorkOrder !== settings.autoCreateWorkOrder) out.autoCreateWorkOrder = draft.autoCreateWorkOrder;
    return out;
  };
  const changed = Object.keys(changes()).length > 0;

  const save = async () => {
    if (!token || !storeId || problems.length || windowTooShort || !changed) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const s = await updateStoreSettings(storeId, changes(), token);
      setSettings(s);
      setDraft(toDraft(s));
      setNotice('Saved. Low-stock and maintenance checks use these from now on.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save the settings.');
    } finally {
      setSaving(false);
    }
  };

  const group = (g: 'stock' | 'maintenance') =>
    FIELDS.filter((f) => f.group === g).map((f) =>
      mayChange && draft ? (
        <Field
          key={f.key}
          label={f.label}
          value={draft[f.key]}
          onChangeText={(v) => setDraft((d) => (d ? { ...d, [f.key]: v } : d))}
          mono
          keyboardType="numeric"
          sub={f.sub}
          error={problems.includes(f.key) ? `${f.min} to ${f.max}.` : undefined}
        />
      ) : (
        <KV key={f.key} k={f.label} v={settings ? String(settings[f.key]) : '—'} />
      ),
    );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.surface }}>
      <ScrollView contentContainerClassName="gap-md px-xl pt-xl pb-xl">
        <Text style={{ ...textStyle(typeScale.screenTitle), color: color.ink }}>Store settings</Text>

        {stores.length > 1 ? (
          <SelectField label="Store" value={storeId} items={stores.map((t) => ({ id: t.id, label: t.name, sublabel: t.code }))} onChange={setStoreId} />
        ) : null}

        {error ? <Callout tone="danger">{error}</Callout> : null}
        {notice ? <Callout tone="success">{notice}</Callout> : null}
        {loading ? <Text style={{ ...textStyle(typeScale.body), color: color.steel }}>Loading…</Text> : null}

        {settings && draft ? (
          <>
            {!settings.customised ? <Callout>{`${settings.tenantName} hasn’t saved its own settings, so these are the defaults.`}</Callout> : null}
            {!mayChange ? (
              <Callout>
                {atOwnStore ? 'Only the store’s Owner changes these.' : 'HQ reads a store’s settings; only that store’s Owner changes them.'}
              </Callout>
            ) : null}

            <Section>Stock</Section>
            {mayChange ? <View style={{ gap: 10 }}>{group('stock')}</View> : <Card>{group('stock')}</Card>}
            {mayChange && windowTooShort ? (
              <Text style={{ ...textStyle(typeScale.helper), color: color.danger }}>Usage needs at least can’t be longer than the usage window.</Text>
            ) : null}

            <Section>Maintenance</Section>
            {mayChange ? (
              <View style={{ gap: 10 }}>
                {group('maintenance')}
                <View style={{ gap: 6 }}>
                  <FieldLabel>Open a work order by itself</FieldLabel>
                  <Row gap={0}>
                    {[true, false].map((on) => (
                      <View key={String(on)} style={{ flex: 1 }}>
                        <Button
                          label={on ? 'Yes' : 'No'}
                          variant={draft.autoCreateWorkOrder === on ? 'primary' : 'secondary'}
                          onPress={() => setDraft((d) => (d ? { ...d, autoCreateWorkOrder: on } : d))}
                        />
                      </View>
                    ))}
                  </Row>
                  <Text style={{ ...textStyle(typeScale.helper), color: color.mute }}>When the nightly check finds a unit that needs work.</Text>
                </View>
              </View>
            ) : (
              <Card>
                {group('maintenance')}
                <KV k="Open a work order by itself" v={settings.autoCreateWorkOrder ? 'Yes' : 'No'} />
              </Card>
            )}

            {mayChange ? (
              <Button
                label={saving ? 'Saving…' : 'Save settings'}
                variant="gated"
                gate="STORE OWNER"
                disabled={saving || !changed || problems.length > 0 || windowTooShort}
                onPress={save}
              />
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
