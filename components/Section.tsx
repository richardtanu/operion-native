import type { PropsWithChildren } from 'react';
import { Text, View } from 'react-native';
import * as tokens from '../theme/tokens';
import { textStyle } from '../theme/typeStyle';

const { color, type: typeScale, border } = tokens;

// Uppercase, stencilled section header with a hairline rule underneath —
// matches base_design/operion-module1-mobile-screens.jsx's Section().
export function Section({ children }: PropsWithChildren) {
  return (
    <View
      style={{
        borderBottomWidth: border.hair,
        borderBottomColor: color.hair,
        paddingBottom: 4,
        marginBottom: 7,
      }}
    >
      <Text style={{ ...textStyle(typeScale.sectionLabel), fontWeight: '600', color: color.steel }}>{children}</Text>
    </View>
  );
}
