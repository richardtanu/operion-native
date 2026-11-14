import type { PropsWithChildren } from 'react';
import { View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export type CardTone = 'neutral' | 'success' | 'warning' | 'danger';

type CardProps = PropsWithChildren<{ tone?: CardTone }>;

// A rounded panel on the screen's darker body, like a phone app's card.
// `tone` colours the border for the one card that needs attention.
export function Card({ tone, children }: CardProps) {
  const { color, tone: toneColors, radius, border } = useTheme();
  return (
    <View
      style={{
        backgroundColor: color.panel,
        borderWidth: tone ? border.base : border.hair,
        borderColor: tone ? toneColors[tone] : color.hair,
        borderRadius: radius.lg,
        padding: 14,
      }}
    >
      {children}
    </View>
  );
}
