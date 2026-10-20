import { Pressable, Text, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { textStyle } from '../theme/typeStyle';

/** 'complete' = everything required on the step is filled; 'missing' = a create attempt found a gap here. */
export type StepState = 'complete' | 'missing' | 'none';

type StepTabsProps = {
  steps: { label: string; state: StepState }[];
  active: number;
  onSelect: (index: number) => void;
};

// Free tabs, not a forced wizard (decision #11): an SM logging their tenth
// purchase jumps straight to the field they need. Each tab says whether its
// step is done (check) or holds a problem (red square), so nobody has to open
// every step to find what's left.
export function StepTabs({ steps, active, onSelect }: StepTabsProps) {
  const { color, type: typeScale, radius, border } = useTheme();
  return (
    <View className="flex-row" style={{ gap: 4 }} accessibilityRole="tablist">
      {steps.map((s, i) => {
        const selected = i === active;
        const stateLabel = s.state === 'complete' ? ', complete' : s.state === 'missing' ? ', needs attention' : '';
        return (
          <Pressable
            key={s.label}
            onPress={() => onSelect(i)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={`Step ${i + 1}, ${s.label}${stateLabel}`}
            style={{
              flex: 1,
              minHeight: 44,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
              borderRadius: radius.sm,
              borderWidth: border.base,
              borderColor: selected ? color.ink : color.line,
              backgroundColor: selected ? color.ink : 'transparent',
              paddingHorizontal: 4,
            }}
          >
            <Text
              numberOfLines={1}
              style={{ ...textStyle(typeScale.chip), fontSize: 13, fontWeight: '700', color: selected ? color.panel : color.steel }}
            >
              {`${i + 1}. ${s.label}`}
            </Text>
            {s.state === 'complete' ? <Check size={14} strokeWidth={3} color={selected ? color.panel : color.good} /> : null}
            {s.state === 'missing' ? (
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: radius.sm,
                  backgroundColor: color.danger,
                  borderWidth: selected ? 1.5 : 0,
                  borderColor: color.panel,
                }}
              />
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}
