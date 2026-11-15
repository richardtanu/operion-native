import { Children, Fragment, type PropsWithChildren } from 'react';
import { Alert, Text, View } from 'react-native';
import { ChevronRight, Lock, type LucideIcon } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { textStyle } from '../theme/typeStyle';
import { Tap } from './Tap';

// Rows grouped in one rounded card with hairlines between them, like a
// phone's settings screen.
export function ListGroup({ children }: PropsWithChildren) {
  const { color, radius, border } = useTheme();
  const rows = Children.toArray(children).filter(Boolean);
  return (
    <View style={{ backgroundColor: color.panel, borderRadius: radius.lg, borderWidth: border.hair, borderColor: color.hair, overflow: 'hidden' }}>
      {rows.map((row, i) => (
        <Fragment key={i}>
          {i > 0 ? <View style={{ height: border.hair, backgroundColor: color.hair, marginLeft: 64 }} /> : null}
          {row}
        </Fragment>
      ))}
    </View>
  );
}

type ListRowProps = {
  Icon: LucideIcon;
  title: string;
  subtitle?: string;
  /** Shown on the right instead of the chevron, e.g. a count or an amount. */
  value?: string;
  onPress?: () => void;
  /** Who may open it, when you may not: the row stays, greyed, with a lock. */
  lockedFor?: string;
  tint?: string;
};

export function ListRow({ Icon, title, subtitle, value, onPress, lockedFor, tint }: ListRowProps) {
  const { color, font, type: typeScale, radius } = useTheme();
  const locked = !!lockedFor;
  const iconColor = locked ? color.mute : (tint ?? color.ink);

  const press = () => {
    if (locked) Alert.alert(title, `Only ${lockedFor} can use this.`);
    else onPress?.();
  };

  return (
    <Tap
      onPress={press}
      disabled={!onPress && !locked}
      accessibilityRole={onPress || locked ? 'button' : undefined}
      accessibilityLabel={locked ? `${title}, locked` : undefined}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 60, paddingVertical: 10, paddingHorizontal: 14 }}
      pressedStyle={{ backgroundColor: color.derived }}
    >
      <View style={{ width: 36, height: 36, borderRadius: radius.md, backgroundColor: `${iconColor}1F`, alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={20} color={iconColor} />
      </View>
      <View style={{ flex: 1, gap: 1 }}>
        <Text style={{ ...textStyle(typeScale.body), fontFamily: font.bodyMedium, color: locked ? color.mute : color.ink }}>{title}</Text>
        {subtitle ? <Text style={{ ...textStyle(typeScale.helper), color: color.steel }}>{subtitle}</Text> : null}
      </View>
      {value ? <Text style={{ ...textStyle(typeScale.value), color: color.ink }}>{value}</Text> : null}
      {locked ? <Lock size={16} color={color.mute} /> : onPress ? <ChevronRight size={18} color={color.steel} /> : null}
    </Tap>
  );
}
