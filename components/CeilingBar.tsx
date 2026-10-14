import { Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

type CeilingBarProps = {
  authorized: number;
  consumed: number;
};

// PRA consumption meter — grey track, black fill for what this line has
// already consumed. No stored "remaining" value: consumed/remaining are
// both computed from `authorized`/`consumed`, matching PRA's own rule that
// remaining is never a stored field. Matches base_design's CeilingBar().
export function CeilingBar({ authorized, consumed }: CeilingBarProps) {
  const { color, font, radius } = useTheme();
  const pct = authorized > 0 ? Math.min(100, (consumed / authorized) * 100) : 0;
  return (
    <View>
      <View style={{ height: 14, backgroundColor: color.hair, borderRadius: radius.sm, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: `${pct}%`, backgroundColor: color.ink }} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 3 }}>
        <Text style={{ fontFamily: font.mono, fontSize: 11, color: color.steel }}>{consumed} used</Text>
        <Text style={{ fontFamily: font.mono, fontSize: 11, color: color.steel }}>{Math.max(0, authorized - consumed)} remaining</Text>
      </View>
    </View>
  );
}
