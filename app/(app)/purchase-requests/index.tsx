import { useCallback, useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Callout, Card, HistoryList, KV, Row, Section, SpendingSummary, TextField } from '../../../components';
import { useAuth } from '../../../auth/AuthContext';
import {
  approvePurchaseRequest,
  cancelPurchaseRequest,
  getPurchaseRequestHistory,
  listPurchaseRequests,
  rejectPurchaseRequest,
} from '../../../api/procurement';
import { getTenantTree } from '../../../api/tenants';
import { canReadSpending, ownerPlus as isOwnerPlus } from '../../../auth/permissions';
import { ApiError } from '../../../api/httpError';
import type { PurchaseRequestResponse, PurchaseRequestStatus, StatusHistoryEntry } from '../../../api/types';
import { useTheme } from '../../../theme/ThemeContext';
import { textStyle } from '../../../theme/typeStyle';


// The real enum has six values — not the four the original wireframe drew.
// AUTHORIZED is the state every PR reaches once realised via the
// direct-purchase path.
const FILTERS: PurchaseRequestStatus[] = ['PENDING', 'APPROVED', 'REJECTED', 'ORDERED', 'AUTHORIZED', 'CANCELLED'];

// PROC-02 — PR Approval Console. List + detail + actions collapsed onto one
// screen. Approve/reject: the store's own OWNER+ (HQ can't decide for a
// store). Cancel (BE-15): a PENDING request by its requester or the store's
// OWNER+, an APPROVED one by the store's OWNER+ only, always with a reason.
// OWNER+ also sees the store's spending this month (BE-16).
export default function PurchaseRequestListScreen() {
  const { color, type: typeScale } = useTheme();
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
  const [ownTenantId, setOwnTenantId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    getTenantTree(token)
      .then((tree) => setOwnTenantId(tree[0]?.id ?? null))
      .catch(() => setOwnTenantId(null));
  }, [token]);

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
  const ownerPlus = isOwnerPlus(user);
  const ownStore = !!selected && selected.tenantId === ownTenantId;
  const mayDecide = ownerPlus && ownStore;
  const isRequester = !!selected && selected.requestedById === user?.id;
  const mayCancel =
    !!selected &&
    ((selected.status === 'PENDING' && (isRequester || mayDecide)) || (selected.status === 'APPROVED' && mayDecide));
  const hasReason = reason.trim().length > 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.surface }}>
      <ScrollView contentContainerClassName="gap-md px-xl pt-xl pb-xl">
        <Text style={{ ...textStyle(typeScale.screenTitle), color: color.ink }}>Requests</Text>

        {token && canReadSpending(user) ? <SpendingSummary token={token} /> : null}

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
                <Text style={{ ...textStyle(typeScale.helper), color: color.steel }}>
                  requested by {pr.requestedByName} · for {pr.tenantName}
                </Text>
              </View>
            </Card>
          ))}
        </View>

        {selected ? (
          <>
            <Section>Selected — {selected.id}</Section>
            <Card>
              <KV k="Status" v={selected.status} />
              <KV k="Store" v={selected.tenantName} />
              <KV k="Requested by" v={selected.requestedByName} />
              <KV k="Created" v={new Date(selected.createdAt).toLocaleString()} />
            </Card>

            {history.length > 0 ? (
              <Card>
                <HistoryList entries={history} />
              </Card>
            ) : null}

            {actionError ? <Callout tone="danger">{actionError}</Callout> : null}

            {selected.status === 'PENDING' || selected.status === 'APPROVED' ? (
              <TextField label="Reason (required to reject or cancel)" value={reason} onChangeText={setReason} placeholder="e.g. bought locally already" />
            ) : null}

            {selected.status === 'PENDING' ? (
            <Row>
              <View style={{ flex: 1 }}>
                <Button
                  label="Approve"
                  variant="gated"
                  gate="OWNER+"
                  disabled={!mayDecide || busy}
                  onPress={() => runAction(() => approvePurchaseRequest(selected.id, token!))}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  label="Reject"
                  variant="gated"
                  gate="OWNER+"
                  disabled={!mayDecide || busy || !hasReason}
                  onPress={() => runAction(() => rejectPurchaseRequest(selected.id, { reason: reason.trim() }, token!))}
                />
              </View>
            </Row>
            ) : null}
            {selected.status === 'PENDING' || selected.status === 'APPROVED' ? (
              <Button
                label="Cancel request"
                variant="gated"
                gate={selected.status === 'PENDING' ? 'REQUESTER·OWNER+' : 'OWNER+'}
                disabled={!mayCancel || busy || !hasReason}
                onPress={() => runAction(() => cancelPurchaseRequest(selected.id, { reason: reason.trim() }, token!))}
              />
            ) : null}
            {ownerPlus && !ownStore && !isRequester ? (
              <Callout>This request belongs to {selected.tenantName}. Approving, rejecting and cancelling it is that store's Owner's call.</Callout>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
