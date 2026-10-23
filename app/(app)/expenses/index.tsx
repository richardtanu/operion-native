import { useCallback, useState } from 'react';
import { Link, useFocusEffect } from 'expo-router';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check } from 'lucide-react-native';
import { Button, Callout, Card, Chip, Field, KV, Row } from '../../../components';
import { useAuth } from '../../../auth/AuthContext';
import { canRecordExpense, ownerPlus as isOwnerPlus } from '../../../auth/permissions';
import { listExpenses, markExpensesPaid, undoExpensePayment, voidExpense } from '../../../api/expenses';
import { viewUpload } from '../../../api/uploads';
import { ApiError } from '../../../api/httpError';
import type { ExpenseCategory, ExpenseFilters, ExpenseResponse, ReimbursementMethod } from '../../../api/types';
import { useTheme } from '../../../theme/ThemeContext';
import { textStyle } from '../../../theme/typeStyle';
import { formatDayLabel, parseLocalDateTime, toIsoDate } from '../../../lib/dates';
import { rp } from '../../../lib/money';


type Filter = 'OWED' | 'PAID_BACK' | 'STORE' | 'VOIDED';

const FILTERS: { id: Filter; label: string; query: ExpenseFilters }[] = [
  { id: 'OWED', label: 'Owed', query: { paidBy: 'PERSONAL', reimbursementStatus: 'PENDING' } },
  { id: 'PAID_BACK', label: 'Paid back', query: { paidBy: 'PERSONAL', reimbursementStatus: 'REIMBURSED' } },
  { id: 'STORE', label: 'Paid by store', query: { paidBy: 'STORE', status: 'ACTIVE' } },
  { id: 'VOIDED', label: 'Voided', query: { status: 'VOIDED' } },
];

const CATEGORY_LABEL: Record<ExpenseCategory, string> = { HQ: 'HQ', BRANCH_SPECIFIC: 'Branch specific' };
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// PROC-10 — Expenses (BE-19). Branch spending that isn't stock, in two tabs
// ("HQ" and "Branch specific": a label only — the branch pays both and both
// count in its budget). Money the Store Manager paid is paid back exactly like
// PROC-08: the store's own Owner selects one or several, never money owed to
// themself. No editing: a wrong entry is voided with a reason (whoever
// recorded it, or the Owner) and entered again.
export default function ExpensesScreen() {
  const { color, type: typeScale, radius, border } = useTheme();
  const { user, token } = useAuth();
  const [category, setCategory] = useState<ExpenseCategory>('BRANCH_SPECIFIC');
  const [filter, setFilter] = useState<Filter>('OWED');
  const [items, setItems] = useState<ExpenseResponse[]>([]);
  const [monthTotal, setMonthTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<string[]>([]);
  const [paidAt, setPaidAt] = useState(toIsoDate(new Date()));
  const [method, setMethod] = useState<ReimbursementMethod>('TRANSFER');
  const [reference, setReference] = useState('');
  const [reasonFor, setReasonFor] = useState<{ id: string; action: 'VOID' | 'UNDO' } | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const ownerPlus = isOwnerPlus(user);
  const now = new Date();
  const monthStart = toIsoDate(new Date(now.getFullYear(), now.getMonth(), 1));

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    setSelected([]);
    setReasonFor(null);
    try {
      const query = FILTERS.find((f) => f.id === filter)!.query;
      setItems(await listExpenses(token, { ...query, category }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load expenses.');
    } finally {
      setLoading(false);
    }
    // Amounts are only all visible from Owner up, so only they get the month's total.
    if (ownerPlus) {
      listExpenses(token, { category, status: 'ACTIVE', from: monthStart })
        .then((month) => setMonthTotal(month.reduce((sum, e) => sum + (e.amount ?? 0), 0)))
        .catch(() => setMonthTotal(null));
    }
  }, [token, filter, category, ownerPlus, monthStart]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const toggle = (id: string) => setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const selectedTotal = items.filter((e) => selected.includes(e.id)).reduce((sum, e) => sum + (e.amount ?? 0), 0);
  const multiStore = new Set(items.map((e) => e.tenantId)).size > 1;

  const run = async (action: () => Promise<unknown>, done: string, failed: string) => {
    if (!token) return;
    setBusy(true);
    setActionError(null);
    try {
      await action();
      setNotice(done);
      setReason('');
      setReference('');
      await load();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : failed);
    } finally {
      setBusy(false);
    }
  };

  const handleMarkPaid = () => {
    if (!token || selected.length === 0) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(paidAt.trim())) return setActionError('Paid date must be YYYY-MM-DD.');
    const count = selected.length;
    run(
      () => markExpensesPaid({ ids: selected, paidAt: paidAt.trim(), method, reference: reference.trim() || undefined }, token),
      `Marked ${count} paid back. The ${count === 1 ? 'person' : 'people'} owed ${count === 1 ? 'has' : 'have'} been told.`,
      'Could not mark these paid back.',
    );
  };

  const handleReason = (e: ExpenseResponse) => {
    if (!token || !reasonFor || !reason.trim()) return;
    if (reasonFor.action === 'VOID') {
      run(() => voidExpense(e.id, { reason: reason.trim() }, token), 'Voided. Enter it again if it was wrong.', 'Could not void this expense.');
    } else {
      run(() => undoExpensePayment(e.id, { reason: reason.trim() }, token), 'Moved back to owed.', 'Could not undo this.');
    }
  };

  const openReceipt = async (uploadId: string) => {
    if (!token) return;
    try {
      const view = await viewUpload(uploadId, token);
      await Linking.openURL(view.getUrl);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Could not open the receipt.');
    }
  };

  const emptyText: Record<Filter, string> = {
    OWED: 'Nobody is owed money for expenses right now.',
    PAID_BACK: 'Nothing paid back yet.',
    STORE: 'No expenses paid by the store.',
    VOIDED: 'Nothing voided.',
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.surface }}>
      <ScrollView contentContainerClassName="gap-md px-xl pt-xl pb-xl">
        <Text style={{ ...textStyle(typeScale.screenTitle), color: color.ink }}>Expenses</Text>

        <View className="flex-row">
          {(['HQ', 'BRANCH_SPECIFIC'] as ExpenseCategory[]).map((c) => (
            <View key={c} style={{ flex: 1 }}>
              <Button label={CATEGORY_LABEL[c]} variant={category === c ? 'primary' : 'secondary'} onPress={() => setCategory(c)} />
            </View>
          ))}
        </View>

        {ownerPlus && monthTotal != null ? (
          <KV k={`${MONTHS[now.getMonth()]} · ${CATEGORY_LABEL[category]}`} v={rp(monthTotal)} strong derived />
        ) : null}

        <Link href="/(app)/expenses/create" asChild>
          <Button label="Add expense" variant="gated" gate="MANAGER+" disabled={!canRecordExpense(user)} />
        </Link>

        <View className="flex-row flex-wrap" style={{ gap: 6 }}>
          {FILTERS.map((f) => (
            <Button
              key={f.id}
              label={f.label}
              variant={filter === f.id ? 'primary' : 'secondary'}
              onPress={() => setFilter(f.id)}
              style={{ width: 'auto', paddingHorizontal: 10, paddingVertical: 6 }}
            />
          ))}
        </View>

        {error ? <Callout tone="danger">{error}</Callout> : null}
        {notice ? <Callout tone="success">{notice}</Callout> : null}
        {loading ? <Text style={{ ...textStyle(typeScale.body), color: color.steel }}>Loading…</Text> : null}
        {!loading && !error && items.length === 0 ? (
          <Text style={{ ...textStyle(typeScale.body), color: color.mute }}>{emptyText[filter]}</Text>
        ) : null}

        {items.map((e) => {
          const mine = e.createdById === user?.id;
          const selectable = filter === 'OWED' && ownerPlus && !mine;
          const isSelected = selected.includes(e.id);
          const date = parseLocalDateTime(e.expenseDate);
          const payer = e.paidBy === 'STORE' ? 'Paid by store' : mine ? 'Paid by you' : `Paid by ${e.createdByName}`;
          const receipts = e.receiptUploadIds.length;
          const mayVoid = e.status === 'ACTIVE' && e.reimbursementStatus !== 'REIMBURSED' && (mine || ownerPlus);
          const mayUndo = filter === 'PAID_BACK' && ownerPlus && !mine;
          const asking = reasonFor?.id === e.id;
          return (
            <Pressable key={e.id} disabled={!selectable} onPress={() => toggle(e.id)} accessibilityRole={selectable ? 'checkbox' : undefined} accessibilityState={selectable ? { checked: isSelected } : undefined}>
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
                    <Text style={{ ...textStyle(typeScale.cardTitle), color: e.status === 'VOIDED' ? color.mute : color.ink }}>{e.description}</Text>
                    <Text style={{ ...textStyle(typeScale.helper), color: color.steel }}>
                      {[multiStore ? e.tenantName : null, payer, date ? formatDayLabel(date) : null, receipts ? `${receipts} receipt${receipts === 1 ? '' : 's'}` : null]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                  </View>
                  <Text style={{ ...textStyle(typeScale.valueLarge), fontSize: 19, color: e.amount == null || e.status === 'VOIDED' ? color.mute : color.ink }}>
                    {e.amount == null ? 'Hidden' : rp(e.amount)}
                  </Text>
                </View>

                <View style={{ marginTop: 8, gap: 6 }}>
                  <Row gap={6}>
                    {e.status === 'VOIDED' ? (
                      <Chip label="Voided" tone="danger" />
                    ) : e.reimbursementStatus === 'PENDING' ? (
                      <Chip label="Owed" tone="warning" />
                    ) : e.reimbursementStatus === 'REIMBURSED' ? (
                      <Chip label="Paid back" tone="success" />
                    ) : (
                      <Chip label="Store" />
                    )}
                  </Row>

                  {e.status === 'VOIDED' ? (
                    <Text style={{ ...textStyle(typeScale.helper), color: color.steel }}>{`Voided by ${e.voidedByName ?? '—'}: ${e.voidReason ?? ''}`}</Text>
                  ) : null}

                  {e.reimbursementStatus === 'REIMBURSED' ? (
                    <View>
                      <KV k="Paid back" v={e.reimbursedAt ? formatDayLabel(parseLocalDateTime(e.reimbursedAt) ?? new Date()) : '—'} />
                      <KV k="How" v={[e.reimbursementMethod === 'CASH' ? 'Cash' : 'Transfer', e.reimbursementReference].filter(Boolean).join(' · ')} />
                    </View>
                  ) : null}

                  {receipts ? (
                    <Text onPress={() => openReceipt(e.receiptUploadIds[0])} accessibilityRole="button" style={{ ...textStyle(typeScale.helper), color: color.info }}>
                      {receipts === 1 ? 'View receipt' : `View receipt (1 of ${receipts})`}
                    </Text>
                  ) : null}

                  {asking ? (
                    <View style={{ gap: 8 }}>
                      <Field
                        label="Reason (required)"
                        value={reason}
                        onChangeText={setReason}
                        placeholder={reasonFor!.action === 'VOID' ? 'e.g. amount was wrong' : 'e.g. marked the wrong one'}
                      />
                      <Row>
                        <View style={{ flex: 1 }}>
                          <Button label="Keep" variant="secondary" onPress={() => setReasonFor(null)} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Button
                            label={reasonFor!.action === 'VOID' ? 'Void' : 'Undo'}
                            variant="gated"
                            gate={reasonFor!.action === 'VOID' ? 'CREATOR·OWNER+' : 'STORE OWNER'}
                            disabled={busy || !reason.trim()}
                            onPress={() => handleReason(e)}
                          />
                        </View>
                      </Row>
                    </View>
                  ) : mayUndo ? (
                    <Button label="Undo paid back" variant="secondary" onPress={() => setReasonFor({ id: e.id, action: 'UNDO' })} style={{ paddingVertical: 8 }} />
                  ) : mayVoid ? (
                    <Button label="Void" variant="secondary" onPress={() => setReasonFor({ id: e.id, action: 'VOID' })} style={{ paddingVertical: 8 }} />
                  ) : null}
                </View>
              </Card>
            </Pressable>
          );
        })}

        {actionError ? <Callout tone="danger">{actionError}</Callout> : null}

        {filter === 'OWED' && ownerPlus && items.length > 0 ? (
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
          Both tabs are the branch's own spending and count in its monthly budget. The store Owner pays back what the Store
          Manager paid; nobody marks money owed to themself, and HQ can see this list but not mark it.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
