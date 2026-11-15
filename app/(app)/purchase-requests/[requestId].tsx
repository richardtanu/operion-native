import { useCallback, useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { Button, Callout, Card, Chip, HistoryList, KV, Row, Screen, Section, TextField } from '../../../components';
import { useAuth } from '../../../auth/AuthContext';
import {
  approvePurchaseRequest,
  cancelPurchaseRequest,
  getPurchaseRequest,
  getPurchaseRequestHistory,
  rejectPurchaseRequest,
} from '../../../api/procurement';
import { listParts } from '../../../api/parts';
import { ownerPlus as isOwnerPlus } from '../../../auth/permissions';
import { ApiError } from '../../../api/httpError';
import type { PartResponse, PurchaseRequestResponse, StatusHistoryEntry } from '../../../api/types';
import { formatDayLabel, formatTime, parseLocalDateTime } from '../../../lib/dates';
import { REQUEST_STATUS_TONE, requestCode } from '../../../lib/requestCode';
import { useStoreInfo } from '../../../lib/useStoreInfo';
import { useTheme } from '../../../theme/ThemeContext';
import { textStyle } from '../../../theme/typeStyle';

/** A quantity as people say it: "1 item", "5 items". */
const itemsLabel = (n: number) => `${n} item${n === 1 ? '' : 's'}`;

// PROC-02 detail — one purchase request on its own page, opened from the
// Requests list (15 Nov 2026). Its items (with each item's category, type and
// stock now, read from the store's item list), its history, and the actions.
// Approve/reject: the store's own OWNER+ (HQ can't decide for a store).
// Cancel (BE-15): a PENDING request by its requester or the store's OWNER+,
// an APPROVED one by the store's OWNER+ only, always with a reason.
export default function PurchaseRequestDetailScreen() {
  const { color, font, type: typeScale } = useTheme();
  const { requestId } = useLocalSearchParams<{ requestId: string }>();
  const router = useRouter();
  const { user, token } = useAuth();
  const store = useStoreInfo();
  const [pr, setPr] = useState<PurchaseRequestResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [history, setHistory] = useState<StatusHistoryEntry[]>([]);
  const [parts, setParts] = useState<PartResponse[]>([]);
  const [reason, setReason] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!token || !requestId) return;
    setLoadError(null);
    try {
      setPr(await getPurchaseRequest(requestId, token));
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Could not load this request.');
    }
    getPurchaseRequestHistory(requestId, token)
      .then(setHistory)
      .catch(() => setHistory([]));
  }, [token, requestId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!token) return;
    listParts(token)
      .then(setParts)
      .catch(() => setParts([]));
  }, [token]);

  if (!pr) {
    return (
      <Screen title="Request">
        {loadError ? <Callout tone="danger">{loadError}</Callout> : <Text style={{ ...textStyle(typeScale.body), color: color.steel }}>Loading…</Text>}
      </Screen>
    );
  }

  // A decision ends the job on this page, so it goes to the Requests list,
  // which reloads and no longer shows the request under its old status.
  // dismissTo goes back to the list when it's underneath and opens it when
  // it isn't. The move happens only once the server has said yes, and
  // outside the try, so a navigation hiccup can't pass for a failed approval.
  const runAction = async (fn: () => Promise<PurchaseRequestResponse>) => {
    setActionError(null);
    setBusy(true);
    let decided = false;
    try {
      await fn();
      decided = true;
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Action failed.');
    } finally {
      setBusy(false);
    }
    if (decided) router.dismissTo('/(app)/purchase-requests');
  };

  const at = parseLocalDateTime(pr.createdAt);
  const ownerPlus = isOwnerPlus(user);
  const ownStore = !!store && pr.tenantId === store.id;
  const mayDecide = ownerPlus && ownStore;
  const isRequester = pr.requestedById === user?.id;
  const mayCancel = (pr.status === 'PENDING' && (isRequester || mayDecide)) || (pr.status === 'APPROVED' && mayDecide);
  const open = pr.status === 'PENDING' || pr.status === 'APPROVED';
  const hasReason = reason.trim().length > 0;
  const partById = new Map(parts.map((p) => [p.id, p]));
  const totalQty = pr.items.reduce((s, i) => s + i.quantity, 0);

  return (
    <Screen title={requestCode(pr)}>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <Chip label={pr.status} tone={REQUEST_STATUS_TONE[pr.status]} solid={pr.status === 'PENDING'} />
          {at ? <Text style={{ ...textStyle(typeScale.helper), color: color.steel }}>{`${formatDayLabel(at)} · ${formatTime(at)}`}</Text> : null}
        </View>
        <KV k="Store" v={pr.tenantName} />
        <KV k="Requested by" v={pr.requestedByName} />
        <KV k="Parts" v={String(pr.items.length)} />
        <KV k="Total items" v={itemsLabel(totalQty)} strong />
        <Text selectable style={{ fontFamily: font.mono, fontSize: 11, color: color.mute, marginTop: 6 }}>{`ID ${pr.id}`}</Text>
      </Card>

      <Section>{`Parts (${pr.items.length})`}</Section>
      {pr.items.map((item, i) => {
        const part = partById.get(item.partId);
        const low = part && part.minimumStock != null && part.currentStock <= part.minimumStock;
        const meta = part ? [part.categoryName ?? 'Uncategorised', part.partTypeName, part.brand].filter(Boolean).join(' · ') : null;
        return (
          <Card key={item.id}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
              <Text style={{ fontFamily: font.mono, fontSize: 12, color: color.mute, marginTop: 3 }}>{String(i + 1).padStart(2, '0')}</Text>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ ...textStyle(typeScale.cardTitle), color: color.ink }}>{item.partName}</Text>
                {meta ? <Text style={{ ...textStyle(typeScale.helper), color: color.steel }}>{meta}</Text> : null}
                {part ? (
                  <Text style={{ ...textStyle(typeScale.helper), color: low ? color.warn : color.steel }}>
                    {`In stock now: ${part.currentStock}${part.minimumStock != null ? ` · minimum ${part.minimumStock}` : ''}${low ? ' · low' : ''}`}
                  </Text>
                ) : null}
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ ...textStyle(typeScale.value), fontFamily: font.bodyBold, fontSize: 17, color: color.ink }}>{itemsLabel(item.quantity)}</Text>
              </View>
            </View>
          </Card>
        );
      })}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTopWidth: 1,
          borderTopColor: color.line,
          paddingTop: 10,
          paddingHorizontal: 4,
        }}
      >
        <Text style={{ ...textStyle(typeScale.body), fontFamily: font.bodyBold, color: color.ink }}>Total</Text>
        <Text style={{ ...textStyle(typeScale.value), fontFamily: font.bodyBold, color: color.ink }}>
          {`${pr.items.length} part${pr.items.length === 1 ? '' : 's'} · ${itemsLabel(totalQty)}`}
        </Text>
      </View>

      {history.length > 0 ? (
        <>
          <Section>History</Section>
          <Card>
            <HistoryList entries={history} />
          </Card>
        </>
      ) : null}

      {open ? (
        <>
          <Section>Decision</Section>
          {actionError ? <Callout tone="danger">{actionError}</Callout> : null}
          <TextField label="Reason (required to reject or cancel)" value={reason} onChangeText={setReason} placeholder="e.g. bought locally already" />
          {pr.status === 'PENDING' ? (
            <Row>
              <View style={{ flex: 1 }}>
                <Button label="Approve" variant="gated" gate="OWNER+" disabled={!mayDecide || busy} onPress={() => runAction(() => approvePurchaseRequest(pr.id, token!))} />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  label="Reject"
                  variant="gated"
                  gate="OWNER+"
                  disabled={!mayDecide || busy || !hasReason}
                  onPress={() => runAction(() => rejectPurchaseRequest(pr.id, { reason: reason.trim() }, token!))}
                />
              </View>
            </Row>
          ) : null}
          <Button
            label="Cancel request"
            variant="gated"
            gate={pr.status === 'PENDING' ? 'REQUESTER·OWNER+' : 'OWNER+'}
            disabled={!mayCancel || busy || !hasReason}
            onPress={() => runAction(() => cancelPurchaseRequest(pr.id, { reason: reason.trim() }, token!))}
          />
          {ownerPlus && !ownStore && !isRequester ? (
            <Callout>This request belongs to {pr.tenantName}. Approving, rejecting and cancelling it is that store's Owner's call.</Callout>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}
