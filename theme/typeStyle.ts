import type { TextStyle } from 'react-native';

type TypeToken = {
  family: string;
  size: number;
  lineHeight?: number;
  letterSpacing?: number;
  uppercase?: boolean;
};

/** Spreads one of theme/tokens.js's named `type` styles into an RN Text style. */
export function textStyle(token: TypeToken): TextStyle {
  return {
    fontFamily: token.family,
    fontSize: token.size,
    ...(token.lineHeight ? { lineHeight: token.lineHeight } : null),
    ...(token.letterSpacing ? { letterSpacing: token.letterSpacing } : null),
    ...(token.uppercase ? { textTransform: 'uppercase' as const } : null),
  };
}
