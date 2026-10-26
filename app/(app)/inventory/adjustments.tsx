import { useCallback, useState } from 'react';
import { Link, useFocusEffect } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Callout, Card, Chip, Field, Row } from '../../../components';
import { useAuth } from '../../../auth/AuthContext';
import { canDecideStockAdjustment, canRequestStockAdjustment } from '../../../auth/permissions';
import {
  approveStockAdjustment,
  listPendingStockAdjustments,
  listStockAdjustments,
  rejectStockAdjustment,
} from '../../../api/inventory';
import { listParts } from '../../../api/parts';
import { ApiError } from '../../../api/httpError';
import type { StockAdjustmentResponse } from '../../../api/types';
import { useTheme } from '../../../theme/ThemeContext';
import { textStyle } from '../../../theme/typeStyle';
import { formatDayLabel, formatTime, parseLocalDateTime } from '../../../lib/dates';


type Tab = 'WAITING' | 'HISTORY';

// INV-04 — Stock adjustments (BE-25). Only the store's own Owners approve or
// reject (HQ is refused). Your own request needs another Owner, unless you're
// the store's only one — then it's approved and flagged "self-approved", the
// same visible-not-blocked choice as self-received goods. Never queued: an
// approval changes stock and must succeed or fail now.
export default function StockAdjustmentsScreen() {
  const { color, type: typeScale } = useTheme();
  const { user, token } = useAuth();
  const [tab, setTab] = useState<Tab>('WAITING');
  const [items, setItems] = useState<StockAdjustmentResponse[]>([]);
  const [stock, setStock] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const mayDecide = canDecideStockAdjustment(user);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const list =
        tab === 'WAITING'
          ? await listPendingStockAdjustments(token)
          : (await listStockAdjustments(token)).filter((a) => a.status !== 'PENDING');
      setItems(list.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      if (tab === 'WAITING') {
        listParts(token)
          .then((parts) => setStock(Object.fromEntries(parts.map((p) => [p.id, p.currentStock]))))
          .catch(() => setStock({}));
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load adjustments.');
    } finally {
      setLoading(false);
    }
  }, [token, tab]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const decide = async (fn: () => Promise<StockAdjustmentResponse>, done: (a: StockAdjustmentResponse) => string, failed: string) => {
    setBusy(true);
    setActionError(null);
    try {
      const result = await fn();
      setNotice(done(result));
      setRejectId(null);
      setRejectReason('');
      await load();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : failed);
    } finally {
      setBusy(false);
    }
  };

  const signed = (q: number) => (q > 0 ? `+${q}` : String(q));
  const multiStore = new Set(items.map((a) => a.tenantId)).size > 1;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.surface }}>
      <ScrollView contentContainerClassName="gap-md px-xl pt-xl pb-xl">
        <Text style={{ ...textStyle(typeScale.screenTitle), color: color.ink }}>Adjustments</Text>

        <View className="flex-row">
          {(['WAITING', 'HISTORY'] as Tab[]).map((t) => (
            <View key={t} style={{ flex: 1 }}>
              <Button label={t === 'WAITING' ? 'Waiting' : 'History'} variant={tab === t ? 'primary' : 'secondary'} onPress={() => setTab(t)} />
            </View>
          ))}
        </View>

        <Link href="/(app)/inventory/adjust" asChild>
          <Button label="Ask for adjustment" variant="gated" gate="MANAGER+" disabled={!canRequestStockAdjustment(user)} />
        </Link>

        {error ? <Callout tone="danger">{error}</Callout> : null}
        {notice ? <Callout tone="success">{notice}</Callout> : null}
        {loading ? <Text style={{ ...textStyle(typeScale.body), color: color.steel }}>Loading…</Text> : null}
        {!loading && !error && items.length === 0 ? (
          <Text style={{ ...textStyle(typeScale.body), color: color.mute }}>
            {tab === 'WAITING' ? 'Nothing waiting for an Owner.' : 'No adjustments yet.'}
          </Text>
        ) : null}

        {items.map((a) => {
          const at = parseLocalDateTime(a.createdAt);
          const mine = a.requestedById === user?.id;
          const current = stock[a.partId];
          return (
            <Card key={a.id}>
              <View className="flex-row items-start justify-between" style={{ gap: 8 }}>
                <Text style={{ ...textStyle(typeScale.cardTitle), color: color.ink, flex: 1 }}>{a.partName}</Text>
                <Text style={{ ...textStyle(typeScale.valueLarge), fontSize: 17, color: a.quantity < 0 ? color.danger : color.good }}>{signed(a.quantity)}</Text>
              </View>
              {tab === 'WAITING' && current != null ? (
                <Text style={{ ...textStyle(typeScale.value), color: color.steel }}>{`${current} → ${current + a.quantity}`}</Text>
              ) : null}
              <Text style={{ ...textStyle(typeScale.helper), color: color.steel }}>
                {[multiStore ? a.tenantName : null, mine ? 'Asked by you' : `Asked by ${a.requestedByName}`, at ? `${formatDayLabel(at)} ${formatTime(at)}` : null]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
              <Text style={{ ...textStyle(typeScale.body), color: color.ink, marginTop: 2 }}>{`“${a.reason}”`}</Text>

              {tab === 'HISTORY' || a.selfApproved ? (
                <View style={{ marginTop: 8 }}>
                  <Row gap={6}>
                    {tab === 'HISTORY' ? <Chip label={a.status === 'APPROVED' ? 'Approved' : 'Rejected'} tone={a.status === 'APPROVED' ? 'success' : 'danger'} /> : null}
                    {a.selfApproved ? <Chip label="Self-approved" tone="warning" /> : null}
                  </Row>
                </View>
              ) : null}

              {tab === 'WAITING' && mayDecide ? (
                <View style={{ gap: 8, marginTop: 10 }}>
                  {mine ? (
                    <Text style={{ ...textStyle(typeScale.helper), color: color.steel }}>
                      Your own request: another Owner approves it, unless you're the store's only Owner — then it's marked
                      self-approved.
                    </Text>
                  ) : null}
                  {rejectId === a.id ? (
                    <>
                      <Field label="Reason (required)" value={rejectReason} onChangeText={setRejectReason} placeholder="e.g. counted twice" />
                      <Row>
                        <View style={{ flex: 1 }}>
                          <Button label="Keep" variant="secondary" onPress={() => setRejectId(null)} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Button
                            label="Reject"
                            variant="gated"
                            gate="OWNER+"
                            disabled={busy || !rejectReason.trim()}
                            onPress={() => decide(() => rejectStockAdjustment(a.id, { reason: rejectReason.trim() }, token!), () => 'Rejected. The count is unchanged.', 'Could not reject this.')}
                          />
                        </View>
                      </Row>
                    </>
                  ) : (
                    <>
                      <Button
                        label={busy ? 'Saving…' : 'Approve'}
                        variant="gated"
                        gate="OWNER+"
                        disabled={busy}
                        onPress={() =>
                          decide(
                            () => approveStockAdjustment(a.id, token!),
                            (r) => (r.selfApproved ? 'Approved and marked self-approved. The count has changed.' : 'Approved. The count has changed.'),
                            'Could not approve this.',
                          )
                        }
                      />
                      <Button label="Reject" variant="gated" gate="OWNER+" disabled={busy} onPress={() => setRejectId(a.id)} />
                    </>
                  )}
                </View>
              ) : null}
            </Card>
          );
        })}

        {actionError ? <Callout tone="danger">{actionError}</Callout> : null}

        <Text style={{ ...textStyle(typeScale.helper), color: color.mute }}>
          Only this store's Owners approve. HQ can see adjustments, not approve them.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
