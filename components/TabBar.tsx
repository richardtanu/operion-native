import { Pressable, Text, View } from 'react-native';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { ChartColumn, House, LayoutGrid, Store, type LucideIcon } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { textStyle } from '../theme/typeStyle';

const TABS: Record<string, { label: string; Icon: LucideIcon }> = {
  home: { label: 'Home', Icon: House },
  menu: { label: 'Menu', Icon: LayoutGrid },
  reports: { label: 'Reports', Icon: ChartColumn },
  account: { label: 'Account', Icon: Store },
};

// The bottom tab bar: four icons, the active one in a soft pill with its
// label, like a phone app's navigation bar.
export function TabBar({ state, navigateToTab, insets }: BottomTabBarProps) {
  const { color, type: typeScale, radius, border } = useTheme();

  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: 'row',
        backgroundColor: color.panel,
        borderTopWidth: border.hair,
        borderTopColor: color.hair,
        paddingTop: 8,
        paddingBottom: Math.max(insets.bottom, 10),
      }}
    >
      {state.routes.map((route, index) => {
        const tab = TABS[route.name];
        if (!tab) return null;
        const focused = state.index === index;
        const { Icon } = tab;
        return (
          <Pressable
            key={route.key}
            onPress={() => {
              if (!focused) navigateToTab(route.key);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={tab.label}
            style={{ flex: 1, alignItems: 'center', gap: 4 }}
          >
            <View
              style={{
                width: 64,
                height: 32,
                borderRadius: radius.pill,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: focused ? `${color.ink}26` : 'transparent',
              }}
            >
              <Icon size={24} color={focused ? color.ink : color.steel} />
            </View>
            <Text style={{ ...textStyle(typeScale.chip), color: focused ? color.ink : color.steel }}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
