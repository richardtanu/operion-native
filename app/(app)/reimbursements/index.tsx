import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Info } from 'lucide-react-native';
import { Callout, Card, Chip } from '../../../components';
import { useAuth } from '../../../auth/AuthContext';
import { listRealisasi } from '../../../api/procurement';
import { ApiError } from '../../../api/httpError';
import type { RealisasiResponse } from '../../../api/types';
import * as tokens from '../../../theme/tokens';
import { textStyle } from '../../../theme/typeStyle';

const { color, type: typeScale } = tokens;

const rp = (n: number | null | undefined) => (n == null ? '—' : `Rp ${Math.round(n).toLocaleString('id-ID')}`);

// PROC-08 — Reimbursement Queue. View-only, no "mark as reimbursed" button:
// no backing endpoint exists for it (orphan action, confirmed absent —
// don't add). Filter is applied on the device; the API has no filter for
// this, so it can't paginate correctly once the list grows.
export default function ReimbursementsScreen() {
  const { token } = useAuth();
  const [items, setItems] = useState<RealisasiResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    listRealisasi(token)
      .then((all) =>
        setItems(all.filter((r) => r.paymentMethod === 'PERSONAL_REIMBURSABLE' && r.reimbursementStatus === 'PENDING')),
      )
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load reimbursements.'))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.surface }}>
      <ScrollView contentContainerClassName="gap-md px-xl pt-xl pb-xl">
        <Text style={{ ...textStyle(typeScale.screenTitle), color: color.ink }}>Reimbursements</Text>

        <Callout tone="warning">
          Filter is personal-reimbursable + pending, applied on the device. The API has no filter for it, so this
          can't paginate correctly once the list grows.
        </Callout>

        {error ? <Callout tone="danger">{error}</Callout> : null}
        {loading ? <Text style={{ ...textStyle(typeScale.body), color: color.steel }}>Loading…</Text> : null}
        {!loading && items.length === 0 ? (
          <Text style={{ ...textStyle(typeScale.body), color: color.mute }}>Nothing pending reimbursement.</Text>
        ) : null}

        {items.map((r) => (
          <Card key={r.id}>
            <View className="flex-row items-baseline justify-between" style={{ gap: 10 }}>
              <View>
                <Text style={{ ...textStyle(typeScale.cardTitle), color: color.ink }}>Owed to {r.createdByName}</Text>
                <Text style={{ ...textStyle(typeScale.helper), color: color.steel }}>
                  {r.id} · purchased {new Date(r.purchasedAt).toLocaleDateString()}
                </Text>
              </View>
              <Text style={{ ...textStyle(typeScale.valueLarge), fontSize: 19, color: color.ink }}>{rp(r.totalCost)}</Text>
            </View>
            <View style={{ marginTop: 9 }}>
              <Chip label="Pending" tone="warning" />
            </View>
          </Card>
        ))}

        <Card>
          <View className="flex-row items-start" style={{ gap: 8 }}>
            <Info size={16} color={color.steel} />
            <Text style={{ ...textStyle(typeScale.helper), color: color.steel, flex: 1 }}>
              View only. There is no mark-reimbursed endpoint, so this screen can show the debt but never clear it.
              Settlement happens outside Operion and the record stays PENDING.
            </Text>
          </View>
        </Card>

        <Callout tone="danger">
          The entity stores reimbursedTo and reimbursedAt, but neither is on the response — so even after paying, the
          app couldn't display when or by whom.
        </Callout>
        <Callout>Every figure here inherits Realisasi's cost redaction. Below Owner scope, this screen is a list of names with no amounts.</Callout>
      </ScrollView>
    </SafeAreaView>
  );
}
