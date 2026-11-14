import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Bell } from 'lucide-react-native';
import { useUnreadCount } from '../lib/useUnreadCount';
import { useTheme } from '../theme/ThemeContext';

// The notifications bell in a tab screen's top bar, with the unread count.
export function BellButton() {
  const { color, font, radius } = useTheme();
  const router = useRouter();
  const unread = useUnreadCount();

  return (
    <Pressable
      onPress={() => router.push('/(app)/notifications')}
      accessibilityRole="button"
      accessibilityLabel={unread ? `Notifications, ${unread} unread` : 'Notifications'}
      hitSlop={8}
      style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
    >
      <Bell size={24} color={color.ink} />
      {unread ? (
        <View
          style={{
            position: 'absolute',
            top: 4,
            right: 2,
            minWidth: 20,
            height: 20,
            paddingHorizontal: 5,
            borderRadius: radius.pill,
            backgroundColor: color.danger,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 2,
            borderColor: color.ground,
          }}
        >
          <Text style={{ fontFamily: font.bodyBold, fontSize: 11, color: '#FFFFFF' }}>{unread > 99 ? '99+' : unread}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}
