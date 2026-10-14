import type { PropsWithChildren } from 'react';
import { Text } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { textStyle } from '../theme/typeStyle';

export function FieldLabel({ children }: PropsWithChildren) {
  const { color, type: typeScale } = useTheme();
  return (
    <Text style={{ ...textStyle(typeScale.fieldLabel), fontWeight: '600', color: color.mute, marginBottom: 3 }}>
      {children}
    </Text>
  );
}
