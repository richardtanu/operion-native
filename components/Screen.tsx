import type { PropsWithChildren, ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Menu } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { textStyle } from '../theme/typeStyle';
import { useSideMenu } from './SideMenu';

type ScreenProps = PropsWithChildren<{
  title: string;
  /**
   * What sits left of the title: 'back' on every pushed screen (the
   * default), 'menu' on the four tab screens, which open the side menu.
   */
  leading?: 'back' | 'menu';
  /** Right side of the bar, e.g. the notifications bell on a tab screen. */
  trailing?: ReactNode;
  /** Shown under the title, still on the bar's colour: Home's store banner. */
  header?: ReactNode;
  /** false when the screen brings its own FlatList. */
  scroll?: boolean;
}>;

// Every screen's frame since the 15 Nov 2026 redesign: a dark top bar with the
// title centred, like a phone app, and a scrolling body of rounded cards.
// Pushed screens have no tab bar, so the body leaves room for the home
// indicator; tab screens sit above the tab bar, which does that itself.
export function Screen({ title, leading = 'back', trailing, header, scroll = true, children }: ScreenProps) {
  const { color, type: typeScale, border } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const sideMenu = useSideMenu();

  const onLeading = () => {
    if (leading === 'menu') sideMenu.open();
    else if (router.canGoBack()) router.back();
    else router.replace('/(app)/(tabs)/home');
  };
  const LeadingIcon = leading === 'menu' ? Menu : ChevronLeft;
  const bottom = leading === 'menu' ? 24 : 24 + insets.bottom;

  return (
    <View style={{ flex: 1, backgroundColor: color.surface }}>
      <View style={{ backgroundColor: color.ground, paddingTop: insets.top, borderBottomWidth: border.hair, borderBottomColor: color.hair }}>
        <View style={{ height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6 }}>
          <Pressable
            onPress={onLeading}
            accessibilityRole="button"
            accessibilityLabel={leading === 'menu' ? 'Open menu' : 'Back'}
            hitSlop={8}
            style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
          >
            <LeadingIcon size={leading === 'menu' ? 24 : 26} color={color.ink} />
          </Pressable>
          <Text numberOfLines={1} accessibilityRole="header" style={{ ...textStyle(typeScale.screenTitle), color: color.ink, flex: 1, textAlign: 'center' }}>
            {title}
          </Text>
          <View style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>{trailing}</View>
        </View>
        {header ? <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>{header}</View> : null}
      </View>
      {scroll ? (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingBottom: bottom, gap: 12 }}>
          {children}
        </ScrollView>
      ) : (
        <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }}>{children}</View>
      )}
    </View>
  );
}
