import type { PropsWithChildren } from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { textStyle } from '../theme/typeStyle';

export type CalloutTone = 'neutral' | 'success' | 'warning' | 'danger';

type CalloutProps = PropsWithChildren<{
  title?: string;
  tone?: CalloutTone;
}>;

// A tinted note box: an error, a warning, or an open question kept visible
// instead of silently resolved — never used to answer the question.
export function Callout({ title, tone = 'neutral', children }: CalloutProps) {
  const { color, tone: toneColors, font, type: typeScale, radius, border } = useTheme();
  const c = tone === 'neutral' ? color.steel : toneColors[tone];

  return (
    <View
      style={{
        borderWidth: border.hair,
        borderColor: tone === 'neutral' ? color.hair : `${c}66`,
        borderRadius: radius.md,
        padding: 12,
        backgroundColor: tone === 'neutral' ? color.panel : `${c}1A`,
        gap: 4,
      }}
    >
      {title ? <Text style={{ fontFamily: font.bodyBold, fontSize: 14, color: c }}>{title}</Text> : null}
      <Text style={{ ...textStyle(typeScale.helper), color: tone === 'neutral' ? color.steel : c }}>{children}</Text>
    </View>
  );
}
