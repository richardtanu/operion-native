import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { Button, Callout, Chip, Screen, SpendingSummary, Tap } from '../../../components';
import { useAuth } from '../../../auth/AuthContext';
import { listPurchaseRequests } from '../../../api/procurement';
import { canReadSpending, canSetBudget } from '../../../auth/permissions';
import { ApiError } from '../../../api/httpError';
import type { PurchaseRequestResponse, PurchaseRequestStatus } from '../../../api/types';
import { formatDayLabel, formatTime, parseLocalDateTime } from '../../../lib/dates';
import { REQUEST_STATUS_TONE, requestCode } from '../../../lib/requestCode';
import { useTheme } from '../../../theme/ThemeContext';
import { textStyle } from '../../../theme/typeStyle';


// The real enum has six values — not the four the original wireframe drew.
// AUTHORIZED is the state every PR reaches once realised via the
// direct-purchase path.
const FILTERS: PurchaseRequestStatus[] = ['PENDING', 'APPROVED', 'REJECTED', 'ORDERED', 'AUTHORIZED', 'CANCELLED'];

// PROC-02 — Requests. A list of cards, each named by its short code
// (date-requester-time) with its lines; tapping one opens its detail page
// (purchase-requests/[requestId]), where the items, history and the
// approve / reject / cancel actions live (15 Nov 2026; until then the detail
// opened inside this list). OWNER+ and Accounting (BE-41) also see the
// store's spending this month (BE-16).
export default function PurchaseRequestListScreen() {
  const { color, font, type: typeScale, radius, border } = useTheme();
  const router = useRouter();
  const { user, token } = useAuth();
  const [filter, setFilter] = useState<PurchaseRequestStatus>('PENDING');
  const [items, setItems] = useState<PurchaseRequestResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  // Reload whenever the list comes back into view: a decision taken on the
  // detail page moves the request to another filter.
  useFocusEffect(
    useCallback(() => {
      if (!token) return;
      setLoading(true);
      setListError(null);
      listPurchaseRequests(token)
        .then(setItems)
        .catch((err) => setListError(err instanceof ApiError ? err.message : 'Could not load purchase requests.'))
        .finally(() => setLoading(false));
    }, [token]),
  );

  const filtered = items
    .filter((i) => i.status === filter)
    .sort((a, b) => (parseLocalDateTime(b.createdAt)?.getTime() ?? 0) - (parseLocalDateTime(a.createdAt)?.getTime() ?? 0));
  const countOf = (s: PurchaseRequestStatus) => items.filter((i) => i.status === s).length;

  return (
    <Screen title="Requests">
      {token && canReadSpending(user) ? <SpendingSummary token={token} canSetBudget={canSetBudget(user)} /> : null}

      <View className="flex-row flex-wrap" style={{ gap: 6 }}>
        {FILTERS.map((f) => {
          const n = countOf(f);
          return <Button key={f} label={n ? `${f} · ${n}` : f} variant={filter === f ? 'primary' : 'secondary'} onPress={() => setFilter(f)} compact />;
        })}
      </View>

      {listError ? <Callout tone="danger">{listError}</Callout> : null}
      {loading && items.length === 0 ? <Text style={{ ...textStyle(typeScale.body), color: color.steel }}>Loading…</Text> : null}
      {!loading && !listError && filtered.length === 0 ? (
        <Text style={{ ...textStyle(typeScale.body), color: color.mute }}>No requests with status {filter}.</Text>
      ) : null}

      {filtered.map((pr) => {
        const at = parseLocalDateTime(pr.createdAt);
        const names = pr.items.map((i) => `${i.partName} ×${i.quantity}`);
        return (
          <Tap
            key={pr.id}
            onPress={() => router.push({ pathname: '/(app)/purchase-requests/[requestId]', params: { requestId: pr.id } })}
            accessibilityRole="button"
            accessibilityLabel={`Request ${requestCode(pr)}, ${pr.status}`}
            style={{
              backgroundColor: color.panel,
              borderRadius: radius.lg,
              borderWidth: border.hair,
              borderColor: color.hair,
              padding: 14,
              gap: 6,
            }}
            pressedStyle={{ backgroundColor: color.derived }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text numberOfLines={1} style={{ fontFamily: font.monoMedium, fontSize: 14, color: color.ink, flex: 1 }}>
                {requestCode(pr)}
              </Text>
              <Chip label={pr.status} tone={REQUEST_STATUS_TONE[pr.status]} />
              <ChevronRight size={18} color={color.steel} />
            </View>
            <Text numberOfLines={2} style={{ ...textStyle(typeScale.body), fontFamily: font.bodyMedium, color: color.ink }}>
              {names.slice(0, 3).join(', ')}
              {names.length > 3 ? ` and ${names.length - 3} more` : ''}
            </Text>
            <Text style={{ ...textStyle(typeScale.helper), color: color.steel }}>
              {`${pr.items.length} line${pr.items.length === 1 ? '' : 's'} · by ${pr.requestedByName} · for ${pr.tenantName}`}
            </Text>
            {at ? <Text style={{ ...textStyle(typeScale.helper), color: color.mute }}>{`${formatDayLabel(at)} · ${formatTime(at)}`}</Text> : null}
          </Tap>
        );
      })}
    </Screen>
  );
}
