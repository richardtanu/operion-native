import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check } from 'lucide-react-native';
import { Button, Callout, Card, Chip, Field, KV, Row } from '../../../components';
import { useAuth } from '../../../auth/AuthContext';
import { ownerPlus as isOwnerPlus } from '../../../auth/permissions';
import { listRealisasi, markReimbursed, undoReimbursement } from '../../../api/procurement';
import { ApiError } from '../../../api/httpError';
import type { RealisasiResponse, ReimbursementMethod } from '../../../api/types';
import { useTheme } from '../../../theme/ThemeContext';
import { textStyle } from '../../../theme/typeStyle';
import { formatDayLabel, parseLocalDateTime, toIsoDate } from '../../../lib/dates';
import { rp } from '../../../lib/money';


type Tab = 'PENDING' | 'REIMBURSED';

// PROC-08 — Reimbursements (BE-18). Purchases paid with personal money, owed
// or paid back, filtered on the server. The store's own Owner selects one or
// several and marks them paid back on whatever schedule suits the branch;
// undo needs a reason. Nobody marks money owed to themself (403), HQ can see
// but not mark (403). The person owed always sees their own amounts; every
// other amount is hidden below Owner.
export default function ReimbursementsScreen() {
  const { color, type: typeScale, radius, border } = useTheme();
  const { user, token } = useAuth();
  const [tab, setTab] = useState<Tab>('PENDING');
  const [items, setItems] = useState<RealisasiResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<string[]>([]);
  const [paidAt, setPaidAt] = useState(toIsoDate(new Date()));
  const [method, setMethod] = useState<ReimbursementMethod>('TRANSFER');
  const [reference, setReference] = useState('');
  const [undoId, setUndoId] = useState<string | null>(null);
  const [undoReason, setUndoReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const ownerPlus = isOwnerPlus(user);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      setItems(await listRealisasi(token, { paymentMethod: 'PERSONAL_REIMBURSABLE', reimbursementStatus: tab }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load reimbursements.');
    } finally {
      setLoading(false);
    }
  }, [token, tab]);

  useEffect(() => {
    setSelected([]);
    setUndoId(null);
    load();
  }, [load]);

  const toggle = (id: string) => setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const selectedTotal = items.filter((r) => selected.includes(r.id)).reduce((sum, r) => sum + (r.totalCost ?? 0), 0);

  const handleMarkPaid = async () => {
    if (!token || selected.length === 0) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(paidAt.trim())) return setActionError('Paid date must be YYYY-MM-DD.');
    setBusy(true);
    setActionError(null);
    try {
      const done = await markReimbursed({ ids: selected, paidAt: paidAt.trim(), method, reference: reference.trim() || undefined }, token);
      setNotice(`Marked ${done.length} paid back. The ${done.length === 1 ? 'person' : 'people'} owed ${done.length === 1 ? 'has' : 'have'} been told.`);
      setSelected([]);
      setReference('');
      await load();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Could not mark these paid back.');
    } finally {
      setBusy(false);
    }
  };

  const handleUndo = async (id: string) => {
    if (!token || !undoReason.trim()) return;
    setBusy(true);
    setActionError(null);
    try {
      await undoReimbursement(id, { reason: undoReason.trim() }, token);
      setUndoId(null);
      setUndoReason('');
      setNotice('Moved back to owed.');
      await load();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Could not undo this.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.surface }}>
      <ScrollView contentContainerClassName="gap-md px-xl pt-xl pb-xl">
        <Text style={{ ...textStyle(typeScale.screenTitle), color: color.ink }}>Reimbursements</Text>

        <View className="flex-row">
          {(['PENDING', 'REIMBURSED'] as Tab[]).map((t) => (
            <View key={t} style={{ flex: 1 }}>
              <Button label={t === 'PENDING' ? 'Owed' : 'Paid back'} variant={tab === t ? 'primary' : 'secondary'} onPress={() => setTab(t)} />
            </View>
          ))}
        </View>

        {error ? <Callout tone="danger">{error}</Callout> : null}
        {notice ? <Callout tone="success">{notice}</Callout> : null}
        {loading ? <Text style={{ ...textStyle(typeScale.body), color: color.steel }}>Loading…</Text> : null}
        {!loading && items.length === 0 ? (
          <Text style={{ ...textStyle(typeScale.body), color: color.mute }}>
            {tab === 'PENDING' ? 'Nobody is owed money right now.' : 'Nothing paid back yet.'}
          </Text>
        ) : null}

        {items.map((r) => {
          const purchased = parseLocalDateTime(r.purchasedAt);
          const mine = r.createdById === user?.id;
          const selectable = tab === 'PENDING' && ownerPlus && !mine;
          const isSelected = selected.includes(r.id);
          return (
            <Pressable key={r.id} disabled={!selectable} onPress={() => toggle(r.id)} accessibilityRole={selectable ? 'checkbox' : undefined} accessibilityState={selectable ? { checked: isSelected } : undefined}>
              <Card tone={isSelected ? 'success' : undefined}>
                <View className="flex-row items-start" style={{ gap: 10 }}>
                  {selectable ? (
                    <View
                      style={{
                        width: 22,
                        height: 22,
                        marginTop: 2,
                        borderRadius: radius.sm,
                        borderWidth: border.base,
                        borderColor: isSelected ? color.ink : color.line,
                        backgroundColor: isSelected ? color.ink : 'transparent',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {isSelected ? <Check size={14} strokeWidth={3} color={color.panel} /> : null}
                    </View>
                  ) : null}
                  <View style={{ flex: 1 }}>
                    <Text style={{ ...textStyle(typeScale.cardTitle), color: color.ink }}>
                      {mine ? 'Owed to you' : `Owed to ${r.createdByName}`}
                    </Text>
                    <Text style={{ ...textStyle(typeScale.helper), color: color.steel }}>
                      {[r.externalOrderRef, r.sellerName ?? r.supplierName, purchased ? `bought ${formatDayLabel(purchased)}` : null].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                  <Text style={{ ...textStyle(typeScale.valueLarge), fontSize: 19, color: r.totalCost == null ? color.mute : color.ink }}>
                    {r.totalCost == null ? 'Hidden' : rp(r.totalCost)}
                  </Text>
                </View>

                {tab === 'REIMBURSED' ? (
                  <View style={{ marginTop: 8 }}>
                    <KV k="Paid back" v={r.reimbursedAt ? formatDayLabel(parseLocalDateTime(r.reimbursedAt) ?? new Date()) : '—'} />
                    <KV k="How" v={[r.reimbursementMethod === 'CASH' ? 'Cash' : 'Transfer', r.reimbursementReference].filter(Boolean).join(' · ')} />
                    {ownerPlus && !mine ? (
                      undoId === r.id ? (
                        <View style={{ gap: 8, marginTop: 6 }}>
                          <Field label="Reason (required)" value={undoReason} onChangeText={setUndoReason} placeholder="e.g. marked the wrong purchase" />
                          <Row>
                            <View style={{ flex: 1 }}>
                              <Button label="Keep" variant="secondary" onPress={() => setUndoId(null)} />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Button label="Undo" variant="gated" gate="STORE OWNER" disabled={busy || !undoReason.trim()} onPress={() => handleUndo(r.id)} />
                            </View>
                          </Row>
                        </View>
                      ) : (
                        <View style={{ marginTop: 6 }}>
                          <Button label="Undo paid back" variant="secondary" onPress={() => setUndoId(r.id)} style={{ paddingVertical: 8 }} />
                        </View>
                      )
                    ) : null}
                  </View>
                ) : (
                  <View style={{ marginTop: 8 }}>
                    <Chip label="Owed" tone="warning" />
                  </View>
                )}
              </Card>
            </Pressable>
          );
        })}

        {actionError ? <Callout tone="danger">{actionError}</Callout> : null}

        {tab === 'PENDING' && ownerPlus && items.length > 0 ? (
          <Card>
            <Text style={{ ...textStyle(typeScale.fieldLabel), color: color.mute }}>
              {selected.length === 0 ? 'Select what you paid back' : `${selected.length} selected · ${rp(selectedTotal)}`}
            </Text>
            <View style={{ gap: 9, marginTop: 8 }}>
              <Row>
                <Field label="Paid on" value={paidAt} onChangeText={setPaidAt} mono placeholder="YYYY-MM-DD" />
                <Field label="Reference" value={reference} onChangeText={setReference} placeholder="e.g. BCA 0123" />
              </Row>
              <Row gap={0}>
                {(['TRANSFER', 'CASH'] as ReimbursementMethod[]).map((m) => (
                  <View key={m} style={{ flex: 1 }}>
                    <Button label={m === 'CASH' ? 'Cash' : 'Transfer'} variant={method === m ? 'primary' : 'secondary'} onPress={() => setMethod(m)} />
                  </View>
                ))}
              </Row>
              <Button
                label={busy ? 'Saving…' : 'Mark paid back'}
                variant="gated"
                gate="STORE OWNER"
                disabled={busy || selected.length === 0}
                onPress={handleMarkPaid}
              />
            </View>
          </Card>
        ) : null}

        <Text style={{ ...textStyle(typeScale.helper), color: color.mute }}>
          The store Owner pays the Store Manager back, whenever suits the branch. Nobody marks money owed to themself, and
          HQ can see this list but not mark it.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
