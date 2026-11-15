import { Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { textStyle } from '../theme/typeStyle';
import { Tap } from './Tap';

type StatCardProps = {
  label: string;
  value: string;
  /** A line under the figure, e.g. "of Rp5.000.000 budget". */
  sub?: string;
  /** Colours the figure: a warning or a danger count. */
  valueColor?: string;
  onPress?: () => void;
};

// One headline figure in a rounded card, two to a row on Home.
export function StatCard({ label, value, sub, valueColor, onPress }: StatCardProps) {
  const { color, type: typeScale, radius, border } = useTheme();
  return (
    <Tap
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={{
        flexBasis: '46%',
        flexGrow: 1,
        backgroundColor: color.panel,
        borderRadius: radius.lg,
        borderWidth: border.hair,
        borderColor: color.hair,
        paddingVertical: 14,
        paddingHorizontal: 12,
        alignItems: 'center',
        gap: 4,
      }}
      pressedStyle={{ backgroundColor: color.derived }}
    >
      <Text style={{ ...textStyle(typeScale.body), color: color.steel }}>{label}</Text>
      <Text numberOfLines={1} adjustsFontSizeToFit style={{ ...textStyle(typeScale.valueLarge), color: valueColor ?? color.ink }}>
        {value}
      </Text>
      {sub ? (
        <View>
          <Text style={{ ...textStyle(typeScale.helper), color: color.steel, textAlign: 'center' }}>{sub}</Text>
        </View>
      ) : null}
    </Tap>
  );
}
