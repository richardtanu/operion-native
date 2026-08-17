import type { PropsWithChildren } from 'react';
import { Text, View } from 'react-native';

type CalloutProps = PropsWithChildren<{
  title?: string;
}>;

// Dashed-border note box, mirroring the web wireframe kit
// (SESSION_BRIEF_C_PENCIL_HANDOFF.md). Used to record what a drawing/build
// revealed that a screen record didn't anticipate, or to surface an open
// question visibly instead of silently resolving it — never used to answer
// the question itself.
export function Callout({ title, children }: CalloutProps) {
  return (
    <View className="gap-xs rounded-md border border-dashed border-neutral-300 bg-neutral-50 p-md">
      {title ? <Text className="text-sm font-semibold text-neutral-700">{title}</Text> : null}
      <Text className="text-sm text-neutral-600">{children}</Text>
    </View>
  );
}
