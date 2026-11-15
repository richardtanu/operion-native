import type { PropsWithChildren } from 'react';
import { Text } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { textStyle } from '../theme/typeStyle';

export function FieldLabel({ children }: PropsWithChildren) {
  const { color, type: typeScale } = useTheme();
  return <Text style={{ ...textStyle(typeScale.fieldLabel), color: color.steel, marginBottom: 6 }}>{children}</Text>;
}
