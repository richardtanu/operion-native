import { useCallback, useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Callout, Card, Chip, type ChipTone, KV, Row, Section, SelectField } from '../../../components';
import { useAuth } from '../../../auth/AuthContext';
import { canReadCashflow } from '../../../auth/permissions';
import { getCashflow } from '../../../api/procurement';
import { getTenantTree } from '../../../api/tenants';
import { ApiError } from '../../../api/httpError';
import type { CashflowEventResponse, CashflowKind, CashflowResponse, TenantResponse } from '../../../api/types';
import { useTheme } from '../../../theme/ThemeContext';
import { textStyle } from '../../../theme/typeStyle';
import { formatDayLabel, parseLocalDateTime, toIsoDate } from '../../../lib/dates';
import { rp } from '../../../lib/money';


const ALL = 'ALL';
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const KIND_LABEL: Record<CashflowKind, string> = {
  PURCHASE: 'Purchase',
  PURCHASE_PAYBACK: 'Paid back · purchase',
  EXPENSE: 'Expense',
  EXPENSE_PAYBACK: 'Paid back · expense',
  ORDER_TO_HQ: 'Order to HQ',
};

// A purchase is listed on the day the store's money left, even while the
// Owner hasn't decided it, or after rejecting it (decision #34).
const STATUS: Record<string, { label: string; tone: ChipTone }> = {
  PENDING_APPROVAL: { label: 'Waiting for the Owner', tone: 'pending' },
  FAILED: { label: 'Rejected · check for a refund', tone: 'danger' },
};

// Cashflow (BE-41). Every movement of money out of the store, on the day it
// moved: a store-paid purchase on its date, an own-money purchase or expense
// on the day it's paid back, a store expense on its date, an order to HQ
// when the Owner sends it. Money in isn't recorded yet (decision #35).
// Accounting and Owner+ read it; HQ can look at one store or all.
export default function CashflowScreen() {
  const { color, type: typeScale } = useTheme();
  const { user, token } = useAuth();
  const allowed = canReadCashflow(user);
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [stores, setStores] = useState<TenantResponse[]>([]);
  const [storeId, setStoreId] = useState<string>(ALL);
  const [data, setData] = useState<CashflowResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    getTenantTree(token)
      .then(setStores)
      .catch(() => setStores([]));
  }, [token]);

  const load = useCallback(async () => {
    if (!token || !allowed) return setLoading(false);
    setLoading(true);
    setError(null);
    try {
      const last = new Date(month.getFullYear(), month.getMonth() + 1, 0);
      setData(await getCashflow(token, { from: toIsoDate(month), to: toIsoDate(last), tenantId: storeId === ALL ? undefined : storeId }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load the cashflow.');
    } finally {
      setLoading(false);
    }
  }, [token, allowed, month, storeId]);

  useEffect(() => {
    load();
  }, [load]);

  const step = (by: number) => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + by, 1));
  const thisMonth = (() => {
    const now = new Date();
    return month.getFullYear() === now.getFullYear() && month.getMonth() === now.getMonth();
  })();
  const multiStore = stores.length > 1;

  // Newest first from the server; grouped by day for reading against a bank statement.
  const days: [string, CashflowEventResponse[]][] = [];
  for (const e of data?.events ?? []) {
    const last = days[days.length - 1];
    if (last && last[0] === e.date) last[1].push(e);
    else days.push([e.date, [e]]);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.surface }}>
      <ScrollView contentContainerClassName="gap-md px-xl pt-xl pb-xl">
        <Text style={{ ...textStyle(typeScale.screenTitle), color: color.ink }}>Cashflow</Text>

        {!allowed ? (
          <Callout tone="warning">The cashflow is for Accounting and the store’s Owner.</Callout>
        ) : (
          <>
            {multiStore ? (
              <SelectField
                label="Store"
                value={storeId}
                items={[{ id: ALL, label: 'Every store' }, ...stores.map((t) => ({ id: t.id, label: t.name, sublabel: t.code }))]}
                onChange={setStoreId}
              />
            ) : null}

            <Row>
              <View style={{ flex: 1 }}>
                <Button label="‹ Earlier" variant="secondary" onPress={() => step(-1)} />
              </View>
              <View style={{ flex: 1 }}>
                <Button label="Later ›" variant="secondary" disabled={thisMonth} onPress={() => step(1)} />
              </View>
            </Row>

            <Card>
              <Text style={{ ...textStyle(typeScale.fieldLabel), color: color.mute }}>{`${MONTHS[month.getMonth()]} ${month.getFullYear()}`}</Text>
              <KV k="Money out" v={data ? rp(data.totalOut) : '—'} strong />
              <Text style={{ ...textStyle(typeScale.helper), color: color.steel, marginTop: 4 }}>
                Money in isn’t recorded in the app yet.
              </Text>
            </Card>

            {error ? <Callout tone="danger">{error}</Callout> : null}
            {loading ? <Text style={{ ...textStyle(typeScale.body), color: color.steel }}>Loading…</Text> : null}
            {!loading && data && data.events.length === 0 ? (
              <Text style={{ ...textStyle(typeScale.body), color: color.mute }}>No money moved this month.</Text>
            ) : null}

            {days.map(([date, events]) => {
              const day = parseLocalDateTime(date);
              return (
                <View key={date} className="gap-sm">
                  <Section>{day ? formatDayLabel(day) : date}</Section>
                  {events.map((e) => {
                    const status = STATUS[e.recordStatus];
                    return (
                      <Card key={`${e.kind}-${e.recordId}`} tone={e.recordStatus === 'FAILED' ? 'danger' : undefined}>
                        <View className="flex-row items-start justify-between" style={{ gap: 8 }}>
                          <View style={{ flex: 1 }}>
                            <Text style={{ ...textStyle(typeScale.cardTitle), color: color.ink }}>{KIND_LABEL[e.kind] ?? e.kind}</Text>
                            <Text style={{ ...textStyle(typeScale.helper), color: color.steel }}>
                              {[multiStore && storeId === ALL ? e.tenantName : null, e.counterparty, e.reference, e.method === 'CASH' ? 'Cash' : e.method === 'TRANSFER' ? 'Transfer' : null]
                                .filter(Boolean)
                                .join(' · ')}
                            </Text>
                          </View>
                          <Text style={{ ...textStyle(typeScale.value), color: color.ink }}>{`− ${rp(e.amount)}`}</Text>
                        </View>
                        {status ? (
                          <View style={{ marginTop: 8 }}>
                            <Chip label={status.label} tone={status.tone} />
                          </View>
                        ) : null}
                      </Card>
                    );
                  })}
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
