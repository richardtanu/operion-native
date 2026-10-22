import { Pressable, Text, TextInput, View, type TextInputProps } from 'react-native';
import { ChevronRight, Lock } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { textStyle } from '../theme/typeStyle';
import { FieldLabel } from './FieldLabel';

type FieldVariant = 'edit' | 'derived' | 'picker';

type FieldProps = {
  label?: string;
  /** Current value. For 'picker' this is the selected item's display text, not free text. */
  value: string;
  placeholder?: string;
  /**
   * 'edit' is a real input. 'derived' is server-computed and never editable —
   * gray/italic with a lock icon, matching base_design's Field(). 'picker' is
   * a tappable row that opens a selection list (Supplier, PRA line, etc.) —
   * never a manual text field once a real list endpoint backs it.
   */
  variant?: FieldVariant;
  /** Force monospace value styling (IDs, quantities, money) even outside 'derived'. */
  mono?: boolean;
  /** Helper caption below the field — unit labels, backend-rule notes. */
  sub?: string;
  /** What's wrong with the value. Danger border and caption; replaces `sub` while set. */
  error?: string;
  /**
   * The value this field had on the record being corrected (supersede), shown
   * as "Changed from …" in the info colour when the current value differs.
   * Ignored while `error` is set.
   */
  changedFrom?: string;
  onChangeText?: (text: string) => void;
  onPress?: () => void;
  keyboardType?: TextInputProps['keyboardType'];
  autoCapitalize?: TextInputProps['autoCapitalize'];
  secureTextEntry?: boolean;
};

export function Field({
  label,
  value,
  placeholder,
  variant = 'edit',
  mono,
  sub,
  error,
  changedFrom,
  onChangeText,
  onPress,
  keyboardType,
  autoCapitalize,
  secureTextEntry,
}: FieldProps) {
  const { color, font, type: typeScale, radius, border } = useTheme();
  const isDerived = variant === 'derived';
  const isPicker = variant === 'picker';
  const isEmpty = !value;
  const isChanged = !error && changedFrom !== undefined && changedFrom !== value;

  const boxStyle = {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    gap: 8,
    borderRadius: radius.sm,
    borderWidth: isDerived ? 0 : error || isChanged ? border.strong : border.base,
    borderColor: error ? color.danger : isChanged ? color.info : color.line,
    backgroundColor: isDerived ? color.derived : color.panel,
    paddingVertical: 9,
    paddingHorizontal: 10,
  };

  const valueTextStyle = {
    ...textStyle(typeScale.value),
    fontFamily: mono || isDerived ? font.mono : font.body,
    fontStyle: isDerived ? ('italic' as const) : ('normal' as const),
    color: isEmpty ? color.mute : isDerived ? color.steel : color.ink,
    flex: 1,
  };

  return (
    <View style={{ flex: 1, minWidth: 0 }}>
      {label ? <FieldLabel>{label}</FieldLabel> : null}

      {isPicker ? (
        <Pressable onPress={onPress} style={boxStyle}>
          <Text numberOfLines={1} style={valueTextStyle}>
            {value || placeholder || '—'}
          </Text>
          <ChevronRight size={15} color={color.mute} />
        </Pressable>
      ) : isDerived ? (
        <View style={boxStyle}>
          <Text numberOfLines={1} style={valueTextStyle}>
            {value || '—'}
          </Text>
          <Lock size={12} color={color.mute} />
        </View>
      ) : (
        <View style={boxStyle}>
          <TextInput
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={color.mute}
            keyboardType={keyboardType}
            autoCapitalize={autoCapitalize}
            secureTextEntry={secureTextEntry}
            style={{ ...valueTextStyle, color: color.ink, padding: 0, flex: 1 }}
          />
        </View>
      )}

      {error ? (
        <Text style={{ ...textStyle(typeScale.helper), color: color.danger, marginTop: 3 }}>{error}</Text>
      ) : isChanged ? (
        <Text style={{ ...textStyle(typeScale.helper), color: color.info, marginTop: 3 }}>
          Changed from {changedFrom || 'empty'}
        </Text>
      ) : sub ? (
        <Text style={{ ...textStyle(typeScale.helper), color: color.mute, marginTop: 3 }}>{sub}</Text>
      ) : null}
    </View>
  );
}
