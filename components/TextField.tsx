import { Text, TextInput, View, type TextInputProps } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { textStyle } from '../theme/typeStyle';

type TextFieldProps = TextInputProps & {
  label: string;
  /**
   * 'editable' is a normal input. 'readonly-derived' is for server-computed
   * values that are never stored — gray/italic, matching Field's `derived`
   * variant. Never render a derived value in the plain editable style —
   * that implies it's a stored field a user could edit, which it isn't.
   */
  variant?: 'editable' | 'readonly-derived';
  error?: string;
};

// Simple label+input for plain forms (login) that don't need Field's
// picker/mono/sub machinery. Prefer Field on procurement screens where a
// value is money, a quantity, an ID, or a picker — TextField is for
// ordinary text entry only.
export function TextField({ label, variant = 'editable', error, style, ...inputProps }: TextFieldProps) {
  const { color, font, type: typeScale, radius, border } = useTheme();
  const isReadonly = variant === 'readonly-derived';

  return (
    <View style={{ gap: 6 }}>
      <Text style={{ ...textStyle(typeScale.fieldLabel), color: color.steel }}>{label}</Text>
      <TextInput
        editable={!isReadonly}
        placeholderTextColor={color.mute}
        style={[
          {
            ...textStyle(typeScale.body),
            fontFamily: isReadonly ? font.bodyMedium : font.body,
            fontStyle: isReadonly ? 'italic' : 'normal',
            color: isReadonly ? color.steel : color.ink,
            backgroundColor: isReadonly ? color.derived : color.panel,
            borderWidth: isReadonly ? 0 : error ? border.strong : border.hair,
            borderColor: error ? color.danger : color.line,
            borderRadius: radius.md,
            minHeight: 48,
            paddingHorizontal: 14,
            paddingVertical: 12,
          },
          style,
        ]}
        {...inputProps}
      />
      {error ? <Text style={{ ...textStyle(typeScale.helper), color: color.danger }}>{error}</Text> : null}
    </View>
  );
}
