import { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { getSpending } from '../api/procurement';
import { setPurchaseBudget } from '../api/tenants';
import { ApiError } from '../api/httpError';
import { Button } from './Button';
import { Field } from './Field';
import type { StoreSpendingResponse } from '../api/types';
import { useTheme } from '../theme/ThemeContext';
import { textStyle } from '../theme/typeStyle';
import { toIsoDate } from '../lib/dates';
import { rp } from '../lib/money';
import { Card } from './Card';
import { KV } from './KV';

type SpendingSummaryProps = { token: string };

// BE-16, OWNER+ only (callers check canReadSpending first). One card per
// store in the caller's tree: a store Owner sees their own store, HQ sees
// every store. "Spent" and "committed" mean exactly what BE-16's
// Definitions say; over budget is a warning colour, never a block.
export function SpendingSummary({ token }: SpendingSummaryProps) {
  const { color, type: typeScale } = useTheme();
  const [rows, setRows] = useState<StoreSpendingResponse[] | null>(null);
  const month = toIsoDate(new Date()).slice(0, 7);

  const [editing, setEditing] = useState(false);
  const [budgetText, setBudgetText] = useState('');
  const [budgetError, setBudgetError] = useState<string | null>(null);

  const load = useCallback(() => {
    getSpending(month, token)
      .then(setRows)
      .catch(() => setRows(null));
  }, [month, token]);

  useEffect(() => {
    load();
  }, [load]);

  if (!rows || rows.length === 0) return null;

  // The caller's own store comes first (BE-16); only its Owner may set its budget.
  const own = rows[0];
  const saveBudget = async () => {
    setBudgetError(null);
    const t = budgetText.trim();
    const amount = t === '' ? null : Number(t);
    if (amount != null && (!Number.isFinite(amount) || amount < 0)) return setBudgetError('Enter an amount, or leave it empty for no budget.');
    try {
      await setPurchaseBudget(own.tenantId, amount, token);
      setEditing(false);
      load();
    } catch (err) {
      setBudgetError(err instanceof ApiError ? err.message : 'Could not save the budget.');
    }
  };

  return (
    <View className="gap-sm">
      {editing ? (
        <Card>
          <Field
            label={`Monthly budget · ${own.tenantName}`}
            value={budgetText}
            onChangeText={setBudgetText}
            mono
            keyboardType="numeric"
            placeholder="Empty = no budget"
            sub="A warning when spent + committed goes over it. It never blocks a purchase."
            error={budgetError ?? undefined}
          />
          <View className="flex-row" style={{ gap: 8, marginTop: 8 }}>
            <View style={{ flex: 1 }}>
              <Button label="Cancel" variant="secondary" onPress={() => setEditing(false)} />
            </View>
            <View style={{ flex: 1 }}>
              <Button label="Save" variant="gated" gate="STORE OWNER" onPress={saveBudget} />
            </View>
          </View>
        </Card>
      ) : null}
      {rows.map((r, i) => (
        <Card key={r.tenantId} tone={r.overBudget ? 'warning' : undefined}>
          <Text style={{ ...textStyle(typeScale.fieldLabel), color: color.mute }}>{`This month · ${r.tenantName}`}</Text>
          <KV k="Spent" v={rp(r.spent)} strong />
          <KV k="· from HQ" v={rp(r.spentFromCentre)} />
          <KV k="· outside" v={rp(r.spentOutside)} />
          <KV k="Committed, not yet spent" v={rp(r.committed)} />
          {r.budget != null ? (
            <Text style={{ ...textStyle(typeScale.helper), color: r.overBudget ? color.warn : color.steel, marginTop: 4 }}>
              {r.overBudget
                ? `Spent + committed is over this month's budget of ${rp(r.budget)}.`
                : `Budget ${rp(r.budget)} · ${rp(r.budget - r.spent - r.committed)} left after committed.`}
            </Text>
          ) : null}
          {i === 0 && !editing ? (
            <Text
              onPress={() => {
                setBudgetText(r.budget != null ? String(r.budget) : '');
                setEditing(true);
              }}
              accessibilityRole="button"
              style={{ ...textStyle(typeScale.helper), color: color.info, marginTop: 6 }}
            >
              {r.budget != null ? 'Change monthly budget' : 'Set a monthly budget'}
            </Text>
          ) : null}
        </Card>
      ))}
    </View>
  );
}
