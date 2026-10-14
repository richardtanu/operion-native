import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowRight, Lock } from 'lucide-react-native';
import { Button, Callout, Card, Chip, KV, Section, type ChipTone } from '../../../components';
import { useAuth } from '../../../auth/AuthContext';
import { getProcurementActivity } from '../../../api/procurement';
import { ApiError } from '../../../api/httpError';
import type { ProcurementActivityEntry, ProcurementEntityType } from '../../../api/types';
import { canReadActivityLog } from '../../../auth/permissions';
import { useTheme } from '../../../theme/ThemeContext';
import { textStyle } from '../../../theme/typeStyle';
import { formatDayLabel, formatTime, parseLocalDateTime, toIsoDate } from '../../../lib/dates';


const TYPE_FILTERS: { value: ProcurementEntityType | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'PURCHASE_REQUEST', label: 'PR' },
  { value: 'PURCHASE_REQUEST_AUTHORIZATION', label: 'PRA' },
  { value: 'REALISASI', label: 'Realisasi' },
  { value: 'PURCHASE_ORDER', label: 'PO' },
];

const TYPE_TAG: Record<ProcurementEntityType, string> = {
  PURCHASE_REQUEST: 'PR',
  PURCHASE_REQUEST_AUTHORIZATION: 'PRA',
  REALISASI: 'REALISASI',
  PURCHASE_ORDER: 'PO',
};

// Days back from today; null = no lower bound.
const PERIODS: { days: number | null; label: string }[] = [
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
  { days: null, label: 'All' },
];

const PAGE = 100;
const MAX_LIMIT = 500; // server cap

// One tone per outcome across all four record types, so "approved" reads
// the same on a PR as on a Realisasi. Unknown values fall back to neutral.
function statusTone(status: string): ChipTone {
  if (['APPROVED', 'AUTHORIZED', 'FULFILLED', 'RECEIVED'].includes(status)) return 'success';
  if (['REJECTED', 'FAILED', 'CANCELLED'].includes(status)) return 'danger';
  if (['PENDING', 'PENDING_APPROVAL', 'ESCALATED', 'PARTIALLY_FULFILLED', 'PARTIALLY_RECEIVED'].includes(status)) return 'pending';
  return 'neutral';
}

const shortId = (id: string) => `#${id.slice(0, 8)}`;

// PROC-09 — Procurement Activity Log (BE-07). HQ's accountability view:
// who requested, approved, authorized, bought and ordered what, across the
// caller's tenant tree. Read-only — every row is a status change already
// recorded in the four *StatusHistory tables; nothing here is editable.
// Filters go to the server (type, from); grouping by day is display only.
export default function ActivityLogScreen() {
  const { color, type: typeScale } = useTheme();
  const { user, token } = useAuth();
  const allowed = canReadActivityLog(user);

  const [type, setType] = useState<ProcurementEntityType | 'ALL'>('ALL');
  const [periodDays, setPeriodDays] = useState<number | null>(30);
  const [limit, setLimit] = useState(PAGE);
  const [entries, setEntries] = useState<ProcurementActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token || !allowed) return;
    setLoading(true);
    setError(null);
    try {
      const from = periodDays == null ? undefined : toIsoDate(new Date(Date.now() - periodDays * 86_400_000));
      setEntries(await getProcurementActivity({ type: type === 'ALL' ? undefined : type, from, limit }, token));
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 403
          ? 'The activity log is for ADMIN or PROCUREMENT users, or Owner scope and above.'
          : err instanceof ApiError
            ? err.message
            : 'Could not load the activity log.',
      );
    } finally {
      setLoading(false);
    }
  }, [token, allowed, type, periodDays, limit]);

  useEffect(() => {
    load();
  }, [load]);

  const groups = useMemo(() => {
    const byDay: { day: string; label: string; items: { key: string; entry: ProcurementActivityEntry; at: Date | null }[] }[] = [];
    entries.forEach((entry, i) => {
      const at = parseLocalDateTime(entry.at);
      const day = entry.at.slice(0, 10);
      let group = byDay[byDay.length - 1];
      if (!group || group.day !== day) {
        group = { day, label: at ? formatDayLabel(at) : day, items: [] };
        byDay.push(group);
      }
      group.items.push({ key: `${entry.entityId}-${entry.at}-${i}`, entry, at });
    });
    return byDay;
  }, [entries]);

  const pill = { width: 'auto' as const, paddingHorizontal: 10, paddingVertical: 6 };

  if (!allowed) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: color.surface }}>
        <View className="gap-md px-xl pt-xl">
          <Text style={{ ...textStyle(typeScale.screenTitle), color: color.ink }}>Activity Log</Text>
          <Callout tone="warning" title="Not available for your account">
            The activity log is for ADMIN or PROCUREMENT users, or Owner scope and above. Ask an admin if you need it.
          </Callout>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.surface }}>
      <ScrollView contentContainerClassName="gap-md px-xl pt-xl pb-xl">
        <View className="gap-xs">
          <Text style={{ ...textStyle(typeScale.screenTitle), color: color.ink }}>Activity Log</Text>
          <Text style={{ ...textStyle(typeScale.helper), color: color.steel }}>
            Every status change on requests, authorizations, purchases and orders across your branches. Newest first.
          </Text>
        </View>

        <View className="flex-row flex-wrap" style={{ gap: 6 }}>
          {TYPE_FILTERS.map((f) => (
            <Button key={f.value} label={f.label} variant={type === f.value ? 'primary' : 'secondary'} onPress={() => {
                setType(f.value);
                setLimit(PAGE); // a new filter starts again from the first page
              }} style={pill} />
          ))}
        </View>
        <View className="flex-row flex-wrap" style={{ gap: 6 }}>
          {PERIODS.map((p) => (
            <Button key={p.label} label={p.label} variant={periodDays === p.days ? 'primary' : 'secondary'} onPress={() => {
                setPeriodDays(p.days);
                setLimit(PAGE);
              }} style={pill} />
          ))}
        </View>

        {error ? <Callout tone="danger">{error}</Callout> : null}
        {loading && entries.length === 0 ? <Text style={{ ...textStyle(typeScale.body), color: color.steel }}>Loading…</Text> : null}
        {!loading && !error && entries.length === 0 ? (
          <Text style={{ ...textStyle(typeScale.body), color: color.mute }}>No changes in this period.</Text>
        ) : null}

        {groups.map((group) => (
          <View key={group.day} className="gap-sm">
            <Section>{group.label}</Section>
            {group.items.map(({ key, entry, at }) => {
              const expanded = expandedKey === key;
              return (
                <Pressable key={key} onPress={() => setExpandedKey(expanded ? null : key)} accessibilityRole="button" accessibilityState={{ expanded }}>
                  <Card>
                    {/* Line 1 — when, what kind, which record */}
                    <View className="flex-row items-center" style={{ gap: 8 }}>
                      <Text style={{ ...textStyle(typeScale.value), color: color.steel }}>{at ? formatTime(at) : '—'}</Text>
                      <Chip label={TYPE_TAG[entry.entityType] ?? entry.entityType} />
                      <Text style={{ ...textStyle(typeScale.value), color: color.ink, flex: 1 }} numberOfLines={1}>
                        {entry.reference ?? shortId(entry.entityId)}
                      </Text>
                    </View>

                    {/* Line 2 — the change itself */}
                    <View className="flex-row flex-wrap items-center" style={{ gap: 6, marginTop: 8 }}>
                      {entry.previousStatus ? (
                        <>
                          <Chip label={entry.previousStatus} tone={statusTone(entry.previousStatus)} />
                          <ArrowRight size={14} color={color.steel} />
                        </>
                      ) : (
                        <Text style={{ ...textStyle(typeScale.helper), color: color.steel }}>Created as</Text>
                      )}
                      <Chip label={entry.newStatus} tone={statusTone(entry.newStatus)} solid />
                    </View>

                    {/* Line 3 — who, where */}
                    <View className="flex-row items-center" style={{ gap: 6, marginTop: 8 }}>
                      {entry.actorName ? (
                        <Text style={{ ...textStyle(typeScale.body), color: color.ink, flexShrink: 1 }}>{entry.actorName}</Text>
                      ) : (
                        // Server-derived (e.g. PRA recomputed to FULFILLED) or written before
                        // actors were recorded — the derived treatment, never a blank.
                        <View className="flex-row items-center" style={{ gap: 4 }}>
                          <Lock size={12} color={color.steel} />
                          <Text style={{ ...textStyle(typeScale.body), fontStyle: 'italic', color: color.steel }}>System</Text>
                        </View>
                      )}
                      <Text style={{ ...textStyle(typeScale.helper), color: color.mute, flexShrink: 1 }} numberOfLines={1}>
                        · {entry.tenantName}
                      </Text>
                    </View>

                    {entry.reason ? (
                      <Text style={{ ...textStyle(typeScale.helper), color: color.steel, marginTop: 6 }}>“{entry.reason}”</Text>
                    ) : null}

                    {expanded ? (
                      <View style={{ marginTop: 8 }}>
                        <KV k="Record ID" v={entry.entityId} />
                        <KV k="When" v={at ? `${formatDayLabel(at)} ${formatTime(at)}` : entry.at} />
                        <KV k="Branch" v={entry.tenantName} />
                        {!entry.actorName ? <KV k="Changed by" v="System or pre-log change" derived /> : null}
                      </View>
                    ) : null}
                  </Card>
                </Pressable>
              );
            })}
          </View>
        ))}

        {/* The server returns at most `limit` rows; a full page means there may be more. */}
        {entries.length >= limit && limit < MAX_LIMIT ? (
          <Button label={loading ? 'Loading…' : 'Load more'} variant="secondary" disabled={loading} onPress={() => setLimit((l) => Math.min(l + PAGE, MAX_LIMIT))} />
        ) : null}
        {entries.length >= MAX_LIMIT ? (
          <Callout>Showing the newest {MAX_LIMIT} changes, the most one load can return. Pick a shorter period or a record type to see older ones.</Callout>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
