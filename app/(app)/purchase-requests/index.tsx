import { useCallback, useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Callout, Card, Chip, KV, Row, Section, TextField } from '../../../components';
import { useAuth } from '../../../auth/AuthContext';
import {
  approvePurchaseRequest,
  cancelPurchaseRequest,
  getPurchaseRequestHistory,
  listPurchaseRequests,
  rejectPurchaseRequest,
} from '../../../api/procurement';
import { ApiError } from '../../../api/httpError';
import type { PurchaseRequestResponse, PurchaseRequestStatus, StatusHistoryEntry } from '../../../api/types';
import * as tokens from '../../../theme/tokens';
import { textStyle } from '../../../theme/typeStyle';

const { color, type: typeScale } = tokens;

// The real enum has six values — not the four the original wireframe drew.
// AUTHORIZED is the state every PR reaches once realised via the
// direct-purchase path.
const FILTERS: PurchaseRequestStatus[] = ['PENDING', 'APPROVED', 'REJECTED', 'ORDERED', 'AUTHORIZED', 'CANCELLED'];

const canApprove = (scope: string | null | undefined) => scope === 'OWNER' || scope === 'PRINCIPAL';

// PROC-02 — PR Approval Console. List + detail + actions collapsed onto one
// screen (matches the design reference's own collapsed treatment — one
// wireframe per record, not navigation state). Approve/reject need Owner+
// server-side; cancel doesn't — that asymmetry is drawn deliberately, not
// normalised away.
export default function PurchaseRequestListScreen() {
  const { user, token } = useAuth();
  const [filter, setFilter] = useState<PurchaseRequestStatus>('PENDING');
  const [items, setItems] = useState<PurchaseRequestResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [history, setHistory] = useState<StatusHistoryEntry[]>([]);
  const [reason, setReason] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setListError(null);
    try {
      setItems(await listPurchaseRequests(token));
    } catch (err) {
      setListError(err instanceof ApiError ? err.message : 'Could not load purchase requests.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const selected = items.find((i) => i.id === selectedId) ?? null;

  useEffect(() => {
    if (!selected || !token) {
      setHistory([]);
      return;
    }
    getPurchaseRequestHistory(selected.id, token)
      .then(setHistory)
      .catch(() => setHistory([]));
  }, [selected, token]);

  const runAction = async (fn: () => Promise<PurchaseRequestResponse>) => {
    setActionError(null);
    setBusy(true);
    try {
      await fn();
      setReason('');
      await load();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Action failed.');
    } finally {
      setBusy(false);
    }
  };

  const filtered = items.filter((i) => i.status === filter);
  const ownerPlus = canApprove(user?.scope);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.surface }}>
      <ScrollView contentContainerClassName="gap-md px-xl pt-xl pb-xl">
        <Text style={{ ...textStyle(typeScale.screenTitle), color: color.ink }}>Requests</Text>

        <View className="flex-row flex-wrap" style={{ gap: 6 }}>
          {FILTERS.map((f) => (
            <Button key={f} label={f} variant={filter === f ? 'primary' : 'secondary'} onPress={() => setFilter(f)} style={{ width: 'auto', paddingHorizontal: 10, paddingVertical: 6 }} />
          ))}
        </View>

        {listError ? <Callout tone="danger">{listError}</Callout> : null}
        {loading ? <Text style={{ ...textStyle(typeScale.body), color: color.steel }}>Loading…</Text> : null}
        {!loading && filtered.length === 0 ? (
          <Text style={{ ...textStyle(typeScale.body), color: color.mute }}>No requests with status {filter}.</Text>
        ) : null}

        <View className="gap-sm">
          {filtered.map((pr) => (
            <Card key={pr.id}>
              <View>
                <Text
                  onPress={() => setSelectedId(pr.id === selectedId ? null : pr.id)}
                  style={{ ...textStyle(typeScale.value), color: color.ink }}
                >
                  {pr.id}
                </Text>
                <Text style={{ ...textStyle(typeScale.cardTitle), color: color.ink }} onPress={() => setSelectedId(pr.id === selectedId ? null : pr.id)}>
                  {pr.items.length} line{pr.items.length === 1 ? '' : 's'}
                </Text>
                <Text style={{ ...textStyle(typeScale.helper), color: color.steel }}>requested by {pr.requestedByName}</Text>
              </View>
            </Card>
          ))}
        </View>

        {selected ? (
          <>
            <Section>Selected — {selected.id}</Section>
            <Card>
              <KV k="Status" v={selected.status} />
              <KV k="Requested by" v={selected.requestedByName} />
              <KV k="Created" v={new Date(selected.createdAt).toLocaleString()} />
            </Card>

            {history.length > 0 ? (
              <Card>
                {history.map((h, idx) => (
                  <KV key={h.id ?? idx} k={h.status ?? 'change'} v={h.createdAt ? new Date(h.createdAt).toLocaleString() : '—'} />
                ))}
              </Card>
            ) : null}

            {actionError ? <Callout tone="danger">{actionError}</Callout> : null}

            <TextField label="Reason (required for reject)" value={reason} onChangeText={setReason} placeholder="Why is this rejected?" />

            <Row>
              <View style={{ flex: 1 }}>
                <Button
                  label="Approve"
                  variant="gated"
                  gate="OWNER+"
                  disabled={!ownerPlus || busy}
                  onPress={() => runAction(() => approvePurchaseRequest(selected.id, token!))}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  label="Reject"
                  variant="gated"
                  gate="OWNER+"
                  disabled={!ownerPlus || busy || reason.trim().length === 0}
                  onPress={() => runAction(() => rejectPurchaseRequest(selected.id, { reason: reason.trim() }, token!))}
                />
              </View>
            </Row>
            <Button label="Cancel" variant="secondary" disabled={busy} onPress={() => runAction(() => cancelPurchaseRequest(selected.id, token!))} />
            <Callout tone="warning">
              The asymmetry is real: approve and reject need Owner+, cancel needs nothing. The gated border carries
              that at a glance.
            </Callout>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
