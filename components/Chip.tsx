import { Text, View } from 'react-native';

export type ChipTone = 'neutral' | 'success' | 'warning' | 'danger' | 'pending';

type ChipProps = {
  label: string;
  tone?: ChipTone;
};

const toneStyles: Record<ChipTone, { bg: string; text: string }> = {
  neutral: { bg: 'bg-neutral-100', text: 'text-neutral-700' },
  success: { bg: 'bg-status-success/15', text: 'text-status-success' },
  warning: { bg: 'bg-status-warning/15', text: 'text-status-warning' },
  danger: { bg: 'bg-status-danger/15', text: 'text-status-danger' },
  pending: { bg: 'bg-status-pending/15', text: 'text-status-pending' },
};

// A single status badge. Screens with more than one independent status
// dimension (e.g. Realisasi's `status` + `varianceStatus`, plan.md §5.1)
// render multiple Chips side by side — never merge them into one, per the
// web wireframe kit's explicit rule (SESSION_BRIEF_C_PENCIL_HANDOFF.md).
// Composing that layout is the screen's job; this component only renders one.
export function Chip({ label, tone = 'neutral' }: ChipProps) {
  const { bg, text } = toneStyles[tone];
  return (
    <View className={`self-start rounded-full px-md py-xs ${bg}`}>
      <Text className={`text-xs font-medium ${text}`}>{label}</Text>
    </View>
  );
}
