import { Text, View } from 'react-native';
import { Lock } from 'lucide-react-native';
import type { StatusHistoryEntry } from '../api/types';
import { useTheme } from '../theme/ThemeContext';
import { textStyle } from '../theme/typeStyle';
import { formatDayLabel, formatTime, parseLocalDateTime } from '../lib/dates';

/** "Rina Wijaya", "Automatic · after Rina Wijaya — SHP-ORD-88213 approved", or "Not recorded" (BE-22). */
export function actorLabel(e: { actorKind: string; triggeredByName: string | null; triggerReference: string | null }, name: string | null): string {
  if (e.actorKind === 'AUTOMATIC') {
    const who = e.triggeredByName ? `after ${e.triggeredByName}` : 'by the system';
    return e.triggerReference ? `Automatic · ${who} — ${e.triggerReference}` : `Automatic · ${who}`;
  }
  if (e.actorKind === 'NOT_RECORDED' || !name) return 'Not recorded';
  return name;
}

type HistoryListProps = { entries: StatusHistoryEntry[] };

// Status history for one record, oldest first as the server returns it.
// Automatic changes and unrecorded actors get the derived treatment (lock,
// italic, steel), never a blank.
export function HistoryList({ entries }: HistoryListProps) {
  const { color, type: typeScale } = useTheme();
  return (
    <View style={{ gap: 8 }}>
      {entries.map((h, i) => {
        const at = parseLocalDateTime(h.createdAt);
        const derived = h.actorKind !== 'USER';
        return (
          <View key={`${h.createdAt}-${i}`} style={{ gap: 1 }}>
            <Text style={{ ...textStyle(typeScale.value), fontSize: 13, color: color.ink }}>
              {h.previousStatus ? `${h.previousStatus} → ${h.newStatus}` : `Created as ${h.newStatus}`}
            </Text>
            <View className="flex-row items-center" style={{ gap: 4 }}>
              {derived ? <Lock size={11} color={color.steel} /> : null}
              <Text
                style={{
                  ...textStyle(typeScale.helper),
                  color: h.actorKind === 'NOT_RECORDED' ? color.mute : color.steel,
                  fontStyle: derived ? 'italic' : 'normal',
                  flexShrink: 1,
                }}
              >
                {`${actorLabel(h, h.changedByName)} · ${at ? `${formatDayLabel(at)} ${formatTime(at)}` : h.createdAt}`}
              </Text>
            </View>
            {h.reason ? <Text style={{ ...textStyle(typeScale.helper), color: color.steel }}>“{h.reason}”</Text> : null}
          </View>
        );
      })}
    </View>
  );
}
