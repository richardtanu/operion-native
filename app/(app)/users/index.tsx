import { useCallback, useState } from 'react';
import { Link, useFocusEffect, useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Callout, Card, Chip, Row, SelectField } from '../../../components';
import { useAuth } from '../../../auth/AuthContext';
import { canManagePeople, canManagePerson } from '../../../auth/permissions';
import { listUsers } from '../../../api/users';
import { getTenantTree } from '../../../api/tenants';
import { ApiError } from '../../../api/httpError';
import type { TenantResponse, UserProfileResponse } from '../../../api/types';
import { useTheme } from '../../../theme/ThemeContext';
import { textStyle } from '../../../theme/typeStyle';
import { ROLE_LABEL, scopeLabel } from '../../../lib/people';


type Tab = 'ON' | 'OFF';
const ALL = 'ALL';

// Users (BE-33, BE-34). An Admin sees their tree (or one store in it); a
// store's Owner sees their own store. Switched-off people sit on their own
// tab with who did it and why. People the viewer can't change — Owners and
// Admins for a store Owner, anyone above an Admin's own scope, yourself —
// open read-only.
export default function UsersScreen() {
  const { color, type: typeScale } = useTheme();
  const router = useRouter();
  const { user, token } = useAuth();
  const allowed = canManagePeople(user);
  const [tab, setTab] = useState<Tab>('ON');
  const [stores, setStores] = useState<TenantResponse[]>([]);
  const [storeId, setStoreId] = useState<string>(ALL);
  const [people, setPeople] = useState<UserProfileResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token || !allowed) return setLoading(false);
    setLoading(true);
    setError(null);
    try {
      const [list, tree] = await Promise.all([
        listUsers(token, { active: tab === 'ON', tenantId: storeId === ALL ? undefined : storeId }),
        getTenantTree(token).catch(() => [] as TenantResponse[]),
      ]);
      setPeople(list.sort((a, b) => a.fullName.localeCompare(b.fullName)));
      setStores(tree);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load people.');
    } finally {
      setLoading(false);
    }
  }, [token, allowed, tab, storeId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // Only an Admin's list spans stores; an Owner's is their own store.
  const picksStore = user?.role === 'ADMIN' && stores.length > 1;
  const multiStore = new Set(people.map((p) => p.tenantCode)).size > 1;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.surface }}>
      <ScrollView contentContainerClassName="gap-md px-xl pt-xl pb-xl">
        <Text style={{ ...textStyle(typeScale.screenTitle), color: color.ink }}>People</Text>

        {!allowed ? (
          <Callout tone="warning">Only an Admin or the store’s Owner manages people.</Callout>
        ) : (
          <>
            <Link href="/(app)/users/add" asChild>
              <Button label="Add a person" variant="gated" gate="ADMIN·STORE OWNER" />
            </Link>

            {picksStore ? (
              <SelectField
                label="Store"
                value={storeId}
                items={[{ id: ALL, label: 'Every store' }, ...stores.map((t) => ({ id: t.id, label: t.name, sublabel: t.code }))]}
                onChange={setStoreId}
              />
            ) : null}

            <Row gap={0}>
              {(['ON', 'OFF'] as Tab[]).map((t) => (
                <View key={t} style={{ flex: 1 }}>
                  <Button label={t === 'ON' ? 'Switched on' : 'Switched off'} variant={tab === t ? 'primary' : 'secondary'} onPress={() => setTab(t)} />
                </View>
              ))}
            </Row>

            {error ? <Callout tone="danger">{error}</Callout> : null}
            {loading ? <Text style={{ ...textStyle(typeScale.body), color: color.steel }}>Loading…</Text> : null}
            {!loading && !error && people.length === 0 ? (
              <Text style={{ ...textStyle(typeScale.body), color: color.mute }}>
                {tab === 'ON' ? 'Nobody here yet.' : 'Nobody is switched off.'}
              </Text>
            ) : null}

            {people.map((p) => (
              <Pressable key={p.id} onPress={() => router.push({ pathname: '/(app)/users/[userId]', params: { userId: p.id } })}>
                <Card>
                  <View className="flex-row items-start justify-between" style={{ gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ ...textStyle(typeScale.cardTitle), color: p.active ? color.ink : color.mute }}>
                        {p.id === user?.id ? `${p.fullName} (you)` : p.fullName}
                      </Text>
                      <Text style={{ ...textStyle(typeScale.helper), color: color.steel }}>
                        {multiStore ? `${p.tenantName} · ${p.email}` : p.email}
                      </Text>
                    </View>
                    {!canManagePerson(user, p) ? <Chip label="Read only" /> : null}
                  </View>
                  <View className="flex-row flex-wrap" style={{ gap: 6, marginTop: 8 }}>
                    <Chip label={ROLE_LABEL[p.role]} />
                    <Chip label={scopeLabel(p.scope)} tone={p.scope ? 'neutral' : 'pending'} />
                    {!p.active ? <Chip label="Switched off" tone="danger" /> : null}
                    {p.active && p.mustChangePassword ? <Chip label="Must change password" tone="warning" /> : null}
                  </View>
                  {!p.active && p.deactivationReason ? (
                    <Text style={{ ...textStyle(typeScale.helper), color: color.steel, marginTop: 6 }}>
                      {`${p.deactivatedByName ? `By ${p.deactivatedByName}: ` : ''}${p.deactivationReason}`}
                    </Text>
                  ) : null}
                </Card>
              </Pressable>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
