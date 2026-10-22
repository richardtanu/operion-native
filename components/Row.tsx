import type { PropsWithChildren } from 'react';
import { View } from 'react-native';

type RowProps = PropsWithChildren<{ gap?: number }>;

export function Row({ children, gap = 10 }: RowProps) {
  return <View style={{ flexDirection: 'row', gap }}>{children}</View>;
}
