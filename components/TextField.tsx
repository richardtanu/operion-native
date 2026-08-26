import { Text, TextInput, View, type TextInputProps } from 'react-native';
import * as tokens from '../theme/tokens';
import { textStyle } from '../theme/typeStyle';

const { color, font, type: typeScale, radius, border } = tokens;

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
  const isReadonly = variant === 'readonly-derived';

  return (
    <View style={{ gap: 4 }}>
      <Text style={{ ...textStyle(typeScale.fieldLabel), fontWeight: '600', color: color.mute }}>{label}</Text>
      <TextInput
        editable={!isReadonly}
        placeholderTextColor={color.mute}
        style={[
          {
            ...textStyle(typeScale.body),
            fontFamily: isReadonly ? font.mono : font.body,
            fontStyle: isReadonly ? 'italic' : 'normal',
            color: isReadonly ? color.steel : color.ink,
            backgroundColor: isReadonly ? color.derived : color.panel,
            borderWidth: isReadonly ? 0 : border.base,
            borderColor: error ? color.danger : color.line,
            borderRadius: radius.sm,
            paddingHorizontal: 10,
            paddingVertical: 9,
          },
          style,
        ]}
        {...inputProps}
      />
      {error ? <Text style={{ ...textStyle(typeScale.helper), color: color.danger }}>{error}</Text> : null}
    </View>
  );
}
