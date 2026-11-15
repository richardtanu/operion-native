import { Alert, Pressable, Text, View } from 'react-native';
import { Lock, type LucideIcon } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';

export type MenuTileItem = {
  key: string;
  label: string;
  Icon: LucideIcon;
  onPress: () => void;
  /**
   * Who may use it, when you may not (e.g. "the store's Owner"). The tile
   * stays visible, greyed with a lock, and says so when tapped: limits are
   * shown, never hidden (decided 15 Nov 2026).
   */
  lockedFor?: string;
  /** A count waiting for you, such as adjustments to decide. */
  badge?: number | null;
};

type MenuGridProps = { items: MenuTileItem[]; accent?: string };

// Three icon tiles to a row, each a rounded square with its label underneath.
export function MenuGrid({ items, accent }: MenuGridProps) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 18 }}>
      {items.map((item) => (
        <MenuTile key={item.key} item={item} accent={accent} />
      ))}
    </View>
  );
}

function MenuTile({ item, accent }: { item: MenuTileItem; accent?: string }) {
  const { color, font, radius, border } = useTheme();
  const { Icon, label, lockedFor, badge } = item;
  const locked = !!lockedFor;
  const tint = locked ? color.mute : (accent ?? color.ink);

  const onPress = () => {
    if (locked) Alert.alert(label, `Only ${lockedFor} can use this.`);
    else item.onPress();
  };

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={locked ? `${label}, locked` : badge ? `${label}, ${badge} waiting` : label}
      style={({ pressed }) => ({ width: '33.333%', alignItems: 'center', gap: 8, opacity: pressed ? 0.7 : 1 })}
    >
      <View
        style={{
          width: 68,
          height: 68,
          borderRadius: radius.lg + 4,
          backgroundColor: locked ? color.surface : color.panel,
          borderWidth: border.hair,
          borderColor: locked ? color.hair : color.line,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={30} color={tint} strokeWidth={1.75} />
        {locked ? (
          <View
            style={{
              position: 'absolute',
              top: -6,
              right: -6,
              width: 22,
              height: 22,
              borderRadius: radius.pill,
              backgroundColor: color.ground,
              borderWidth: border.hair,
              borderColor: color.line,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Lock size={11} color={color.steel} />
          </View>
        ) : badge ? (
          <View
            style={{
              position: 'absolute',
              top: -6,
              right: -6,
              minWidth: 22,
              height: 22,
              paddingHorizontal: 5,
              borderRadius: radius.pill,
              backgroundColor: color.danger,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontFamily: font.bodyBold, fontSize: 11, color: '#FFFFFF' }}>{badge > 99 ? '99+' : badge}</Text>
          </View>
        ) : null}
      </View>
      <Text numberOfLines={2} style={{ fontFamily: font.bodyMedium, fontSize: 13, lineHeight: 17, textAlign: 'center', color: locked ? color.mute : color.ink, paddingHorizontal: 4 }}>
        {label}
      </Text>
    </Pressable>
  );
}
