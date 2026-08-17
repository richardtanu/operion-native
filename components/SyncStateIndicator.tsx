import { Chip, type ChipTone } from './Chip';
import { Pressable, Text, View } from 'react-native';

export type SyncState = 'queued' | 'confirmed' | 'failed';

type SyncStateIndicatorProps = {
  state: SyncState;
  onRetry?: () => void;
};

const stateConfig: Record<SyncState, { label: string; tone: ChipTone }> = {
  queued: { label: 'Queued', tone: 'pending' },
  confirmed: { label: 'Confirmed', tone: 'success' },
  failed: { label: 'Failed', tone: 'danger' },
};

// The three outbox-write states, rendered consistently everywhere a screen
// writes through the outbox (plan.md §1: "a scan that goes into the outbox
// is not an error ... three visual states, not two: confirmed, queued,
// failed"). Every future write screen should use this instead of drawing its
// own pending/error UI — that's what keeps "queued must never look like an
// error" true by construction rather than a convention someone has to
// remember per screen.
export function SyncStateIndicator({ state, onRetry }: SyncStateIndicatorProps) {
  const { label, tone } = stateConfig[state];

  return (
    <View className="flex-row items-center gap-sm">
      <Chip label={label} tone={tone} />
      {state === 'failed' && onRetry ? (
        <Pressable onPress={onRetry} accessibilityRole="button">
          <Text className="text-xs font-semibold text-brand-500">Retry</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
