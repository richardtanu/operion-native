import { useState } from 'react';
import { useRouter } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Callout, Card, Field, FieldLabel, KV, PhotoPicker, Row, type UploadedPhoto } from '../../../components';
import { useAuth } from '../../../auth/AuthContext';
import { canRecordExpense, canRecordStorePaidExpense } from '../../../auth/permissions';
import { createExpense } from '../../../api/expenses';
import { ApiError } from '../../../api/httpError';
import type { ExpenseCategory, ExpensePaidBy, ExpenseResponse } from '../../../api/types';
import { useTheme } from '../../../theme/ThemeContext';
import { textStyle } from '../../../theme/typeStyle';
import { toIsoDate, toLocalDateTime } from '../../../lib/dates';
import { rp } from '../../../lib/money';


// PROC-10 — Add expense (BE-19). The store's MANAGER+ records; only the
// Owner records what the store paid. A receipt photo is required when you
// paid yourself — it's what the Owner pays you back against — and optional
// when the store paid. Not queued: an expense is money, so it succeeds or
// fails now. There's no editing afterwards; a wrong one is voided and
// entered again.
export default function CreateExpenseScreen() {
  const { color, type: typeScale } = useTheme();
  const router = useRouter();
  const { user, token } = useAuth();
  const mayRecord = canRecordExpense(user);
  const mayRecordStorePaid = canRecordStorePaidExpense(user);

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(toIsoDate(new Date()));
  const [category, setCategory] = useState<ExpenseCategory>('BRANCH_SPECIFIC');
  const [paidBy, setPaidBy] = useState<ExpensePaidBy>('PERSONAL');
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [photoError, setPhotoError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<ExpenseResponse | null>(null);

  const reset = () => {
    setDescription('');
    setAmount('');
    setDate(toIsoDate(new Date()));
    setPhotos([]);
    setPhotoError(undefined);
    setCreated(null);
  };

  const handleSubmit = async () => {
    setError(null);
    setPhotoError(undefined);
    const value = Number(amount.replace(/[^\d]/g, ''));
    if (!description.trim()) return setError('Say what was bought.');
    if (!Number.isFinite(value) || value <= 0) return setError('Enter an amount greater than zero.');
    if (!toLocalDateTime(date)) return setError('Date must be a real date, YYYY-MM-DD.');
    if (paidBy === 'PERSONAL' && photos.length === 0) {
      return setPhotoError('Add a photo of the receipt: it’s what you’re paid back against.');
    }
    if (!token) return setError('Not signed in.');

    setSubmitting(true);
    try {
      setCreated(
        await createExpense(
          { description: description.trim(), amount: value, expenseDate: date.trim(), category, paidBy, receiptUploadIds: photos.map((p) => p.uploadId) },
          token,
        ),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not record the expense.');
    } finally {
      setSubmitting(false);
    }
  };

  if (created) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: color.surface }}>
        <View className="flex-1 gap-lg px-xl pt-xl">
          <Text style={{ ...textStyle(typeScale.heading), color: color.ink }}>Expense recorded</Text>
          <Card>
            <KV k="What" v={created.description} />
            <KV k="Amount" v={created.amount == null ? 'Hidden' : rp(created.amount)} strong />
            <KV k="Paid by" v={created.paidBy === 'STORE' ? 'The store' : 'You — the Owner pays you back'} />
          </Card>
          <Button label="Add another" variant="secondary" onPress={reset} />
          <Button label="Back to Expenses" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.surface }}>
      <ScrollView contentContainerClassName="gap-md px-xl pt-xl pb-xl">
        <Text style={{ ...textStyle(typeScale.screenTitle), color: color.ink }}>Add expense</Text>

        {!mayRecord ? <Callout tone="warning">Only the Store Manager and the Owner record expenses.</Callout> : null}

        <Field label="What" value={description} onChangeText={setDescription} placeholder="e.g. Printer paper A4, 2 reams" />
        <Row>
          <Field label="Amount (Rp)" value={amount} onChangeText={setAmount} mono keyboardType="numeric" placeholder="96000" />
          <Field label="Date" value={date} onChangeText={setDate} mono placeholder="YYYY-MM-DD" />
        </Row>

        <View style={{ gap: 6 }}>
          <FieldLabel>Category</FieldLabel>
          <Row gap={0}>
            {(['HQ', 'BRANCH_SPECIFIC'] as ExpenseCategory[]).map((c) => (
              <View key={c} style={{ flex: 1 }}>
                <Button label={c === 'HQ' ? 'HQ' : 'Branch specific'} variant={category === c ? 'primary' : 'secondary'} onPress={() => setCategory(c)} />
              </View>
            ))}
          </Row>
        </View>

        <View style={{ gap: 6 }}>
          <FieldLabel>Paid by</FieldLabel>
          <Row gap={0}>
            {(['PERSONAL', 'STORE'] as ExpensePaidBy[]).map((p) => (
              <View key={p} style={{ flex: 1 }}>
                <Button
                  label={p === 'PERSONAL' ? 'Me' : 'Store'}
                  variant={paidBy === p ? 'primary' : 'secondary'}
                  disabled={p === 'STORE' && !mayRecordStorePaid}
                  onPress={() => setPaidBy(p)}
                />
              </View>
            ))}
          </Row>
          <Text style={{ ...textStyle(typeScale.helper), color: color.mute }}>Only the store Owner records what the store paid.</Text>
        </View>

        {token ? (
          <PhotoPicker
            label="Receipt photo"
            purpose="EXPENSE_RECEIPT"
            token={token}
            photos={photos}
            onChange={setPhotos}
            sub={paidBy === 'PERSONAL' ? 'Required when you paid yourself: it’s what the Owner pays you back against.' : 'Optional when the store paid.'}
            error={photoError}
          />
        ) : null}

        {error ? <Callout tone="danger">{error}</Callout> : null}

        <Button
          label={submitting ? 'Saving…' : 'Add expense'}
          variant="gated"
          gate="MANAGER+"
          disabled={submitting || !mayRecord}
          onPress={handleSubmit}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
