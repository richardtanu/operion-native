import { useState } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

type TapProps = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  /** Added on top of `style` while a finger is down. */
  pressedStyle?: StyleProp<ViewStyle>;
};

/**
 * A Pressable with press feedback, without a style function. NativeWind's JSX
 * wrapper drops `style={({ pressed }) => …}` on Pressable, which left rows
 * and tiles unstyled on the phone (15 Nov 2026), so the pressed state is
 * tracked here and applied as a plain style instead.
 */
export function Tap({ style, pressedStyle, onPressIn, onPressOut, ...props }: TapProps) {
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      {...props}
      onPressIn={(e) => {
        setPressed(true);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        setPressed(false);
        onPressOut?.(e);
      }}
      style={[style, pressed ? pressedStyle : null]}
    />
  );
}
