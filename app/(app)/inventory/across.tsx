import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Callout, Card, Chip, Row } from '../../../components';
import { useAuth } from '../../../auth/AuthContext';
import { canFileForAnotherStore } from '../../../auth/permissions';
import { getTenantTree } from '../../../api/tenants';
import { useTheme } from '../../../theme/ThemeContext';
import { textStyle } from '../../../theme/typeStyle';
import { coverLabel, encodeLines, worstFirst, type StockLine } from '../../../lib/stockLevel';
import { useStockLines } from '../../../lib/useStockLines';


type Filter = 'ALL' | 'MUST_BUY' | 'OUT';
type Group = { key: string; name: string; mustBuy: boolean; lines: StockLine[] };

// INV-03 — Stock across stores (HQ). Per item, which stores are low or out,
// worst first, so HQ can advise the store's Owner. Each store's copy of an HQ
// item is grouped under that item (BE-26 put the store and the catalog link
// on every row; days left use each store's own settings). HQ doesn't restock
// a store: a request it files is approved by that store's Owner like any other.
export default function StockAcrossStoresScreen() {
  const { color, type: typeScale } = useTheme();
  const router = useRouter();
  const { user, token } = useAuth();
  const { lines, loading, error } = useStockLines(token);
  const [rootId, setRootId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('ALL');

  useFocusEffect(
    useCallback(() => {
      if (!token) return;
      getTenantTree(token)
        .then((tree) => setRootId(tree[0] && tree[0].parentId == null ? tree[0].id : null))
        .catch(() => setRootId(null));
    }, [token]),
  );

  // HQ's own rows name the groups; only the stores' rows are listed.
  const hqNames = new Map(lines.filter((l) => l.tenantId === rootId).map((l) => [l.partId, l.name]));
  const groups = new Map<string, Group>();
  for (const l of lines.filter((x) => x.tenantId !== rootId)) {
    const key = l.catalogPartId ?? l.partId;
    const g = groups.get(key) ?? { key, name: hqNames.get(key) ?? l.name, mustBuy: false, lines: [] };
    g.lines.push(l);
    g.mustBuy = g.mustBuy || !!l.part?.mandatoryFromHq;
    groups.set(key, g);
  }
  const shown = [...groups.values()]
    .map((g) => ({ ...g, lines: g.lines.slice().sort(worstFirst) }))
    .filter((g) => (filter === 'MUST_BUY' ? g.mustBuy : filter === 'OUT' ? g.lines.some((l) => l.lowBecause === 'OUT') : true))
    .sort((a, b) => worstFirst(a.lines[0], b.lines[0]) || a.name.localeCompare(b.name));

  const status = (l: StockLine): { text: string; tone: string } => {
    if (l.lowBecause === 'OUT') return { text: 'out', tone: color.danger };
    if (l.lowBecause === 'RUNS_OUT_SOON') return { text: coverLabel(l), tone: color.warn };
    if (l.lowBecause === 'BELOW_MINIMUM') return { text: `${l.currentStock} · below min ${l.minimumStock ?? 0}`, tone: color.warn };
    return { text: l.daysOfCover != null ? coverLabel(l) : `${l.currentStock} left`, tone: color.good };
  };

  const request = (l: StockLine) =>
    router.push({
      pathname: '/(app)/purchase-requests/create',
      params: { storeId: l.tenantId, lines: encodeLines([{ partId: l.partId, quantity: l.suggestedQty }]) },
    });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.surface }}>
      <ScrollView contentContainerClassName="gap-md px-xl pt-xl pb-xl">
        <Text style={{ ...textStyle(typeScale.screenTitle), color: color.ink }}>Stock across stores</Text>

        <View className="flex-row flex-wrap" style={{ gap: 6 }}>
          {(
            [
              ['ALL', 'All'],
              ['MUST_BUY', 'Must buy from HQ'],
              ['OUT', 'Out'],
            ] as [Filter, string][]
          ).map(([id, label]) => (
            <Button
              key={id}
              label={label}
              variant={filter === id ? 'primary' : 'secondary'}
              onPress={() => setFilter(id)}
              style={{ width: 'auto', paddingHorizontal: 10, paddingVertical: 6 }}
            />
          ))}
        </View>

        {error ? <Callout tone="danger">{error}</Callout> : null}
        {loading ? <Text style={{ ...textStyle(typeScale.body), color: color.steel }}>Loading…</Text> : null}
        {!loading && !error && shown.length === 0 ? (
          <Text style={{ ...textStyle(typeScale.body), color: color.mute }}>Nothing to show.</Text>
        ) : null}

        {shown.map((g) => (
          <Card key={g.key} tone={g.lines[0].lowBecause === 'OUT' ? 'danger' : g.lines[0].lowBecause ? 'warning' : undefined}>
            <View className="flex-row items-start justify-between" style={{ gap: 8 }}>
              <Text style={{ ...textStyle(typeScale.cardTitle), color: color.ink, flex: 1 }}>{g.name}</Text>
              <Row gap={6}>{g.mustBuy ? <Chip label="Must buy from HQ" /> : null}</Row>
            </View>
            <View style={{ gap: 6, marginTop: 6 }}>
              {g.lines.map((l) => {
                const s = status(l);
                return (
                  <View key={l.partId} style={{ gap: 4 }}>
                    <View className="flex-row justify-between" style={{ gap: 8 }}>
                      <Text style={{ ...textStyle(typeScale.body), color: color.ink, flex: 1 }}>{l.tenantName}</Text>
                      <Text style={{ ...textStyle(typeScale.value), color: s.tone }}>{s.text}</Text>
                    </View>
                    {l.lowBecause ? (
                      <Button
                        label={`Request for ${l.tenantName}`}
                        variant="gated"
                        gate="ADMIN·PROC·OWNER+"
                        disabled={!canFileForAnotherStore(user)}
                        onPress={() => request(l)}
                        style={{ paddingVertical: 8 }}
                      />
                    ) : null}
                  </View>
                );
              })}
            </View>
          </Card>
        ))}

        <Callout>HQ advises; the store decides. Tell the store's Owner, or file a request they can approve.</Callout>
      </ScrollView>
    </SafeAreaView>
  );
}
