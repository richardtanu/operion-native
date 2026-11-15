import { Text, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { textStyle } from '../theme/typeStyle';
import { Tap } from './Tap';

type ButtonVariant = 'primary' | 'secondary' | 'gated';

type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  variant?: ButtonVariant;
  /**
   * Small badge next to the label — the scope required for a `gated`
   * action (e.g. "OWNER+"). Carries role.gatedAction's meaning: plain border
   * means anyone can press it, this amber-bordered variant means the
   * backend actually enforces a scope check. Don't add `gate` to a button
   * that isn't really gated server-side.
   */
  gate?: string;
  /** A small pill sized to its label: filter toggles in a row. */
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({ label, variant = 'primary', gate, compact, disabled, style, ...pressableProps }: ButtonProps) {
  const { color, font, type: typeScale, radius, border, glow } = useTheme();

  const backgroundColor = disabled ? color.hair : variant === 'primary' ? color.ink : color.panel;
  const textColor = disabled ? color.mute : variant === 'primary' ? color.panel : color.ink;
  const borderColor = variant === 'gated' ? color.tag : variant === 'secondary' ? color.line : 'transparent';
  const borderWidth = variant === 'gated' ? border.strong : variant === 'secondary' ? border.hair : 0;
  // HUD themes only: a soft glow on the two "do something" variants, not on
  // plain secondary buttons — matches the theme's own gatedAction/ink accent
  // rather than being a generic effect slapped on everything.
  const glowStyle =
    glow && !disabled && (variant === 'primary' || variant === 'gated')
      ? {
          shadowColor: variant === 'gated' ? color.tag : glow.color,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.5,
          shadowRadius: glow.radius,
          elevation: 4,
        }
      : null;

  return (
    <Tap
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      style={[
        {
          width: compact ? 'auto' : '100%',
          minHeight: compact ? 36 : 48,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          borderRadius: compact ? radius.pill : radius.md,
          paddingVertical: compact ? 6 : 12,
          paddingHorizontal: compact ? 14 : 16,
          backgroundColor,
          borderWidth,
          borderColor,
        },
        glowStyle,
        style,
      ]}
      pressedStyle={{ opacity: 0.75 }}
      {...pressableProps}
    >
      <Text style={{ ...textStyle(typeScale.button), fontSize: compact ? 14 : typeScale.button.size, color: textColor }}>{label}</Text>
      {gate ? (
        <View style={{ borderRadius: radius.pill, backgroundColor: `${color.tag}26`, paddingHorizontal: 6, paddingVertical: 1 }}>
          <Text style={{ fontFamily: font.monoMedium, fontSize: 10, color: disabled ? color.mute : color.tag }}>{gate}</Text>
        </View>
      ) : null}
    </Tap>
  );
}
