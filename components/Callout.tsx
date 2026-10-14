import type { PropsWithChildren } from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { textStyle } from '../theme/typeStyle';

export type CalloutTone = 'neutral' | 'success' | 'warning' | 'danger';

type CalloutProps = PropsWithChildren<{
  title?: string;
  tone?: CalloutTone;
}>;

// Dashed-border note box. Used to record what a build revealed that a
// screen record didn't anticipate, or to surface an open question visibly
// instead of silently resolving it — never used to answer the question.
export function Callout({ title, tone = 'neutral', children }: CalloutProps) {
  const { color, tone: toneColors, font, type: typeScale, radius, border } = useTheme();
  const c = tone === 'neutral' ? color.steel : toneColors[tone];
  const tintBg: Record<CalloutTone, string> = {
    neutral: 'transparent',
    success: `${toneColors.success}0F`,
    warning: `${toneColors.warning}0F`,
    danger: `${toneColors.danger}0F`,
  };

  return (
    <View
      style={{
        borderWidth: border.base,
        borderStyle: 'dashed',
        borderColor: c,
        borderRadius: radius.sm,
        padding: 9,
        backgroundColor: tintBg[tone],
        gap: 4,
      }}
    >
      {title ? (
        <Text style={{ fontFamily: font.displayBold, fontSize: 12, letterSpacing: 1.1, textTransform: 'uppercase', color: c, fontWeight: '700' }}>
          {title}
        </Text>
      ) : null}
      <Text style={{ ...textStyle(typeScale.helper), color: tone === 'neutral' ? color.steel : c }}>{children}</Text>
    </View>
  );
}
