import { useCallback, useState } from 'react';
import { Link, useFocusEffect, useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Callout, Card, Chip, Row, Section } from '../../../components';
import { useAuth } from '../../../auth/AuthContext';
import { canEditItems, canRetireItems } from '../../../auth/permissions';
import { listParts, restorePart } from '../../../api/parts';
import { ApiError } from '../../../api/httpError';
import type { PartResponse } from '../../../api/types';
import { useTheme } from '../../../theme/ThemeContext';
import { textStyle } from '../../../theme/typeStyle';


// INV-06 — Items. The store's own item list by category: stock, minimum
// (which decides "low" without usage data) and whether each item is linked
// to the one HQ sells. Adding and editing: the store's MANAGER+ or ADMIN;
// retiring and restoring: OWNER+ or ADMIN (BE-25).
export default function ItemsScreen() {
  const { color, type: typeScale } = useTheme();
  const router = useRouter();
  const { user, token } = useAuth();
  const [parts, setParts] = useState<PartResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      setParts(await listParts(token));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load items.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const multiStore = new Set(parts.map((p) => p.tenantId)).size > 1;
  const active = parts.filter((p) => !p.retired).sort((a, b) => a.name.localeCompare(b.name));
  const retired = parts.filter((p) => p.retired);
  const byCategory = new Map<string, PartResponse[]>();
  for (const p of active) {
    const key = p.categoryName ?? 'Uncategorized';
    byCategory.set(key, [...(byCategory.get(key) ?? []), p]);
  }

  const restore = async (id: string) => {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      await restorePart(id, token);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not restore this item.');
    } finally {
      setBusy(false);
    }
  };

  const open = (id: string) => router.push({ pathname: '/(app)/inventory/item/[partId]', params: { partId: id } });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.surface }}>
      <ScrollView contentContainerClassName="gap-md px-xl pt-xl pb-xl">
        <Text style={{ ...textStyle(typeScale.screenTitle), color: color.ink }}>Items</Text>

        <Link href="/(app)/inventory/item-form" asChild>
          <Button label="Add item" variant="gated" gate="MANAGER+·ADMIN" disabled={!canEditItems(user)} />
        </Link>

        {error ? <Callout tone="danger">{error}</Callout> : null}
        {loading ? <Text style={{ ...textStyle(typeScale.body), color: color.steel }}>Loading…</Text> : null}
        {!loading && !error && active.length === 0 ? (
          <Text style={{ ...textStyle(typeScale.body), color: color.mute }}>No items yet.</Text>
        ) : null}

        {[...byCategory.entries()].map(([category, list]) => (
          <View key={category} className="gap-sm">
            <Section>{category}</Section>
            {list.map((p) => (
              <Pressable key={p.id} onPress={() => open(p.id)}>
                <Card>
                  <View className="flex-row items-start justify-between" style={{ gap: 8 }}>
                    <Text style={{ ...textStyle(typeScale.cardTitle), color: color.ink, flex: 1 }}>{p.name}</Text>
                    <Row gap={6}>{p.catalogPartId ? <Chip label="HQ" /> : null}</Row>
                  </View>
                  <Text style={{ ...textStyle(typeScale.value), color: color.steel }}>
                    {`${multiStore ? `${p.tenantName} · ` : ''}${p.currentStock} · min ${p.minimumStock ?? '—'}${p.brand ? ` · ${p.brand}` : ''}`}
                  </Text>
                </Card>
              </Pressable>
            ))}
          </View>
        ))}

        {retired.length ? (
          <View className="gap-sm">
            <Section>Retired</Section>
            {retired.map((p) => (
              <Card key={p.id}>
                <Text style={{ ...textStyle(typeScale.cardTitle), color: color.mute }}>{p.name}</Text>
                {canRetireItems(user) ? (
                  <View style={{ marginTop: 8 }}>
                    <Button label="Restore" variant="gated" gate="OWNER+·ADMIN" disabled={busy} onPress={() => restore(p.id)} />
                  </View>
                ) : null}
              </Card>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
