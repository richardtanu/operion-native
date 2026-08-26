import { Pressable, Text, View } from 'react-native';
import { Chip, type ChipTone } from './Chip';
import * as tokens from '../theme/tokens';

const { color, font } = tokens;

export type SyncState = 'queued' | 'confirmed' | 'failed';

type SyncStateIndicatorProps = {
  state: SyncState;
  onRetry?: () => void;
  /** Inline explanation next to the chip — matches base_design's SyncState() note text. */
  note?: string;
};

const stateConfig: Record<SyncState, { label: string; tone: ChipTone }> = {
  queued: { label: 'Queued', tone: 'pending' },
  confirmed: { label: 'Confirmed', tone: 'success' },
  failed: { label: 'Failed', tone: 'danger' },
};

// The three outbox-write states, rendered consistently everywhere a screen
// writes through the outbox — "a scan that goes into the outbox is not an
// error": three visual states, not two: confirmed, queued, failed.
export function SyncStateIndicator({ state, onRetry, note }: SyncStateIndicatorProps) {
  const { label, tone } = stateConfig[state];

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <Chip label={label} tone={tone} />
      {note ? <Text style={{ fontFamily: font.body, fontSize: 11, color: color.steel }}>{note}</Text> : null}
      {state === 'failed' && onRetry ? (
        <Pressable onPress={onRetry} accessibilityRole="button">
          <Text style={{ fontFamily: font.bodyMedium, fontSize: 12, fontWeight: '600', color: color.ink }}>Retry</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
