import { createContext, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { Alert, Animated, Modal, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell, Bug, Crosshair, Info, LogOut, type LucideIcon } from 'lucide-react-native';
import { useAuth } from '../auth/AuthContext';
import { getApiBaseUrl } from '../api/env';
import { ROLE_LABEL, scopeLabel } from '../lib/people';
import { useUnreadCount } from '../lib/useUnreadCount';
import { useTheme } from '../theme/ThemeContext';
import { textStyle } from '../theme/typeStyle';

type SideMenuValue = { open: () => void };

const SideMenuContext = createContext<SideMenuValue>({ open: () => {} });

/** Opens the side menu from a tab screen's top bar. A no-op outside the tabs. */
export function useSideMenu(): SideMenuValue {
  return useContext(SideMenuContext);
}

// The side menu (15 Nov 2026): who you are, plus the things that aren't a
// tab: notifications, about, and logging out. Slides in from the left over
// the tab screens, the way a phone app's drawer does.
export function SideMenuProvider({ children }: PropsWithChildren) {
  const [visible, setVisible] = useState(false);
  const value = useMemo(() => ({ open: () => setVisible(true) }), []);
  return (
    <SideMenuContext.Provider value={value}>
      {children}
      <SideMenuSheet visible={visible} onClose={() => setVisible(false)} />
    </SideMenuContext.Provider>
  );
}

function SideMenuSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { color, font, type: typeScale, radius, border } = useTheme();
  const { user, logout } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const unread = useUnreadCount(visible);
  const panelWidth = Math.min(320, width * 0.8);
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) Animated.timing(slide, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  }, [visible, slide]);

  const close = (then?: () => void) => {
    Animated.timing(slide, { toValue: 0, duration: 160, useNativeDriver: true }).start(() => {
      onClose();
      then?.();
    });
  };

  const about = () =>
    Alert.alert(
      'About Operion',
      `Version ${Constants.expoConfig?.version ?? '—'}\nServer: ${(() => {
        try {
          return getApiBaseUrl();
        } catch {
          return 'not set';
        }
      })()}`,
    );

  const confirmLogout = () =>
    Alert.alert('Log out?', 'You will need your email and password to sign in again.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => close(() => void logout()) },
    ]);

  const item = (Icon: LucideIcon, label: string, onPress: () => void, opts: { badge?: number | null; danger?: boolean } = {}) => (
    <Pressable
      key={label}
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        minHeight: 52,
        paddingHorizontal: 20,
        backgroundColor: pressed ? color.panel : 'transparent',
      })}
    >
      <Icon size={22} color={opts.danger ? color.danger : color.ink} />
      <Text style={{ ...textStyle(typeScale.body), fontFamily: font.bodyMedium, color: opts.danger ? color.danger : color.ink, flex: 1 }}>{label}</Text>
      {opts.badge ? (
        <View style={{ minWidth: 22, height: 22, borderRadius: radius.pill, backgroundColor: color.danger, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 }}>
          <Text style={{ fontFamily: font.bodyBold, fontSize: 12, color: '#FFFFFF' }}>{opts.badge > 99 ? '99+' : opts.badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={() => close()} statusBarTranslucent>
      <Animated.View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', opacity: slide }}>
        <Pressable style={{ flex: 1 }} onPress={() => close()} accessibilityLabel="Close menu" />
      </Animated.View>
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          width: panelWidth,
          backgroundColor: color.ground,
          borderRightWidth: border.hair,
          borderRightColor: color.hair,
          borderTopRightRadius: radius.lg,
          borderBottomRightRadius: radius.lg,
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 16,
          transform: [{ translateX: slide.interpolate({ inputRange: [0, 1], outputRange: [-panelWidth, 0] }) }],
        }}
      >
        <View style={{ paddingHorizontal: 20, paddingBottom: 20, gap: 12, borderBottomWidth: border.hair, borderBottomColor: color.hair }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Crosshair size={30} color={color.ink} />
            <Text style={{ fontFamily: font.displayBold, fontSize: 26, letterSpacing: 1, color: color.ink }}>OPERION</Text>
          </View>
          {user ? (
            <View style={{ gap: 2 }}>
              <Text style={{ ...textStyle(typeScale.cardTitle), color: color.ink }}>{user.fullName}</Text>
              <Text style={{ ...textStyle(typeScale.helper), color: color.steel }}>
                {`${ROLE_LABEL[user.role]} · ${scopeLabel(user.scope)} · ${user.tenantName}`}
              </Text>
            </View>
          ) : null}
        </View>
        <View style={{ paddingTop: 8, flex: 1 }}>
          {item(Bell, 'Notifications', () => close(() => router.push('/(app)/notifications')), { badge: unread })}
          {item(Info, 'About Operion', () => close(about))}
          {__DEV__ ? item(Bug, 'Outbox (developer)', () => close(() => router.push('/(app)/debug-outbox'))) : null}
        </View>
        {item(LogOut, 'Log out', confirmLogout, { danger: true })}
      </Animated.View>
    </Modal>
  );
}
