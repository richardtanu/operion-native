import { Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { textStyle } from '../theme/typeStyle';

type KVProps = {
  k: string;
  v: string;
  /** Larger, bolder value — the headline figure in a card. */
  strong?: boolean;
  /** Server-computed, never stored — italic, steel instead of ink. */
  derived?: boolean;
};

// Key/value row for card summaries (PRA consumption, Realisasi totals,
// goods-receipt purchased-vs-received): label left, value right.
export function KV({ k, v, strong, derived }: KVProps) {
  const { color, font, type: typeScale } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, paddingVertical: 5 }}>
      <Text style={{ fontFamily: font.body, fontSize: 14, color: color.steel, flexShrink: 1 }}>{k}</Text>
      <Text
        style={{
          ...textStyle(typeScale.value),
          fontFamily: strong ? font.bodyBold : font.bodyMedium,
          fontSize: strong ? 17 : 15,
          fontStyle: derived ? 'italic' : 'normal',
          color: derived ? color.steel : color.ink,
          textAlign: 'right',
          flexShrink: 1,
        }}
      >
        {v}
      </Text>
    </View>
  );
}
