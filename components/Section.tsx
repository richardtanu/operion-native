import type { PropsWithChildren } from 'react';
import { Text } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { textStyle } from '../theme/typeStyle';

// A small uppercase group header above a run of cards or rows, the way
// phone settings screens label their groups.
export function Section({ children }: PropsWithChildren) {
  const { color, type: typeScale } = useTheme();
  return <Text style={{ ...textStyle(typeScale.sectionLabel), color: color.steel, marginTop: 6, marginBottom: 2 }}>{children}</Text>;
}
