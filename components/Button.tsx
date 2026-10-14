import { Pressable, Text, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { textStyle } from '../theme/typeStyle';

type ButtonVariant = 'primary' | 'secondary' | 'gated';

type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  variant?: ButtonVariant;
  /**
   * Small mono badge next to the label — the scope required for a `gated`
   * action (e.g. "OWNER+"). Carries role.gatedAction's meaning: plain border
   * means anyone can press it, this yellow-bordered variant means the
   * backend actually enforces a scope check. Don't add `gate` to a button
   * that isn't really gated server-side.
   */
  gate?: string;
  style?: StyleProp<ViewStyle>;
};

export function Button({ label, variant = 'primary', gate, disabled, style, ...pressableProps }: ButtonProps) {
  const { color, font, type: typeScale, radius, border, glow } = useTheme();

  const backgroundColor = disabled ? color.line : variant === 'primary' ? color.ink : 'transparent';
  const textColor = disabled ? color.panel : variant === 'primary' ? color.panel : color.ink;
  const borderColor = variant === 'gated' ? color.tag : variant === 'secondary' ? color.line : 'transparent';
  const borderWidth = variant === 'gated' ? border.strong : variant === 'secondary' ? border.base : 0;
  // HUD themes only: a soft glow on the two "do something" variants, not on
  // plain secondary buttons — matches the theme's own gatedAction/ink accent
  // rather than being a generic effect slapped on everything.
  const glowStyle =
    glow && !disabled && (variant === 'primary' || variant === 'gated')
      ? {
          shadowColor: variant === 'gated' ? color.tag : glow.color,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.8,
          shadowRadius: glow.radius,
          elevation: 6,
        }
      : null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      style={[
        {
          width: '100%',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          borderRadius: radius.sm,
          paddingVertical: 12,
          paddingHorizontal: 14,
          backgroundColor,
          borderWidth,
          borderColor,
        },
        glowStyle,
        style,
      ]}
      {...pressableProps}
    >
      <Text style={{ ...textStyle(typeScale.button), fontWeight: '700', color: textColor }}>{label}</Text>
      {gate ? (
        <Text style={{ fontFamily: font.mono, fontSize: 10, fontWeight: '600', color: disabled ? color.panel : color.warn }}>
          {gate}
        </Text>
      ) : null}
    </Pressable>
  );
}
