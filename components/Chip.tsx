import { Text, View } from 'react-native';
import * as tokens from '../theme/tokens';
import { textStyle } from '../theme/typeStyle';

const { color, tone: toneColors, type: typeScale, radius, border } = tokens;

export type ChipTone = 'neutral' | 'success' | 'warning' | 'danger' | 'pending';

type ChipProps = {
  label: string;
  tone?: ChipTone;
  /** Filled background instead of the default outline — reserve for the one status that should read loudest on a screen. */
  solid?: boolean;
};

// A single status badge. Screens with more than one independent status
// dimension (e.g. Realisasi's `status` + `varianceStatus`) render multiple
// Chips side by side — never merge them into one. Composing that layout is
// the screen's job; this component only renders one.
export function Chip({ label, tone = 'neutral', solid }: ChipProps) {
  const c = toneColors[tone];
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        borderWidth: border.base,
        borderColor: c,
        borderRadius: radius.sm,
        backgroundColor: solid ? c : 'transparent',
        paddingVertical: 2,
        paddingHorizontal: 8,
      }}
    >
      <Text style={{ ...textStyle(typeScale.chip), fontWeight: '700', color: solid ? color.panel : c }}>{label}</Text>
    </View>
  );
}
