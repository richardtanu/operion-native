import { Text, TextInput, View, type TextInputProps } from 'react-native';

type TextFieldProps = TextInputProps & {
  label: string;
  /**
   * 'editable' is a normal input. 'readonly-derived' is for server-computed
   * values that are never stored (e.g. PRA's remaining balance, plan.md
   * §5.1) — gray/italic, matching the web wireframe kit's Readonly-derived
   * TextField variant (SESSION_BRIEF_C_PENCIL_HANDOFF.md). Never render a
   * derived value in the plain editable style — that implies it's a stored
   * field a user could edit, which it isn't.
   */
  variant?: 'editable' | 'readonly-derived';
  error?: string;
};

export function TextField({ label, variant = 'editable', error, className, ...inputProps }: TextFieldProps) {
  const isReadonly = variant === 'readonly-derived';

  return (
    <View className="gap-xs">
      <Text className="text-sm font-medium text-neutral-600">{label}</Text>
      <TextInput
        editable={!isReadonly}
        placeholderTextColor="#8B909B"
        className={`rounded-md border px-md py-md text-base ${
          isReadonly
            ? 'border-neutral-200 bg-neutral-50 italic text-neutral-500'
            : 'border-neutral-300 bg-neutral-0 text-neutral-900'
        } ${error ? 'border-status-danger' : ''} ${className ?? ''}`}
        {...inputProps}
      />
      {error ? <Text className="text-xs text-status-danger">{error}</Text> : null}
    </View>
  );
}
