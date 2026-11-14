import { Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { textStyle } from '../theme/typeStyle';

export type ChipTone = 'neutral' | 'success' | 'warning' | 'danger' | 'pending';

type ChipProps = {
  label: string;
  tone?: ChipTone;
  /** Filled background instead of the default tint — reserve for the one status that should read loudest on a screen. */
  solid?: boolean;
};

// A single status badge: a tinted pill. Screens with more than one
// independent status dimension (e.g. Realisasi's `status` + `varianceStatus`)
// render multiple Chips side by side — never merge them into one. Composing
// that layout is the screen's job; this component only renders one.
export function Chip({ label, tone = 'neutral', solid }: ChipProps) {
  const { color, tone: toneColors, type: typeScale, radius } = useTheme();
  const c = toneColors[tone];

  return (
    <View
      style={{
        alignSelf: 'flex-start',
        borderRadius: radius.pill,
        backgroundColor: solid ? c : `${c}26`,
        paddingVertical: 3,
        paddingHorizontal: 10,
      }}
    >
      <Text style={{ ...textStyle(typeScale.chip), color: solid ? color.panel : c }}>{label}</Text>
    </View>
  );
}
