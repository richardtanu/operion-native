import type { PropsWithChildren } from 'react';
import { View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export type CardTone = 'neutral' | 'success' | 'warning' | 'danger';

type CardProps = PropsWithChildren<{ tone?: CardTone }>;

export function Card({ tone, children }: CardProps) {
  const { color, tone: toneColors, radius, border } = useTheme();
  return (
    <View
      style={{
        backgroundColor: color.panel,
        borderWidth: border.base,
        borderColor: tone ? toneColors[tone] : color.hair,
        borderRadius: radius.sm,
        padding: 11,
      }}
    >
      {children}
    </View>
  );
}
