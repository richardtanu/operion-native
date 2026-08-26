import { Text, View } from 'react-native';
import * as tokens from '../theme/tokens';

const { color, font } = tokens;

type KVProps = {
  k: string;
  v: string;
  /** Larger, semibold value — the headline figure in a card. */
  strong?: boolean;
  /** Server-computed, never stored — italic, steel instead of ink. */
  derived?: boolean;
};

// Key/value row for card summaries (PRA consumption, Realisasi totals,
// goods-receipt purchased-vs-received). Matches base_design's KV().
export function KV({ k, v, strong, derived }: KVProps) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, paddingVertical: 5 }}>
      <Text style={{ fontFamily: font.body, fontSize: 13, color: color.steel }}>{k}</Text>
      <Text
        style={{
          fontFamily: strong ? font.monoMedium : font.mono,
          fontSize: strong ? 15 : 13,
          fontStyle: derived ? 'italic' : 'normal',
          color: derived ? color.steel : color.ink,
          textAlign: 'right',
        }}
      >
        {v}
      </Text>
    </View>
  );
}
