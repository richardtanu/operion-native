import { Pressable, Text, type PressableProps } from 'react-native';

type ButtonVariant = 'primary' | 'secondary';

type ButtonProps = Omit<PressableProps, 'children'> & {
  label: string;
  variant?: ButtonVariant;
};

// Mirrors the Button vocabulary already established in operion.pen's web
// wireframe kit (SESSION_BRIEF_C_PENCIL_HANDOFF.md): Primary (filled) is the
// main action, Secondary (outlined) is the lesser action. Same vocabulary,
// separate implementation per the plan's "share the contract, not the
// chrome" principle (plan.md §1).
export function Button({ label, variant = 'primary', disabled, className, ...pressableProps }: ButtonProps) {
  const base = 'items-center justify-center rounded-md px-lg py-md';
  const variantStyle =
    variant === 'primary'
      ? 'bg-brand-500 active:bg-brand-600'
      : 'border border-neutral-300 bg-transparent active:bg-neutral-50';
  const disabledStyle = disabled ? 'opacity-50' : '';

  const textStyle =
    variant === 'primary' ? 'text-base font-semibold text-neutral-0' : 'text-base font-semibold text-neutral-700';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      className={`${base} ${variantStyle} ${disabledStyle} ${className ?? ''}`}
      {...pressableProps}
    >
      <Text className={textStyle}>{label}</Text>
    </Pressable>
  );
}
