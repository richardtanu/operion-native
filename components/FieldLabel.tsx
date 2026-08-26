import type { PropsWithChildren } from 'react';
import { Text } from 'react-native';
import * as tokens from '../theme/tokens';
import { textStyle } from '../theme/typeStyle';

const { color, type: typeScale } = tokens;

export function FieldLabel({ children }: PropsWithChildren) {
  return (
    <Text style={{ ...textStyle(typeScale.fieldLabel), fontWeight: '600', color: color.mute, marginBottom: 3 }}>
      {children}
    </Text>
  );
}
