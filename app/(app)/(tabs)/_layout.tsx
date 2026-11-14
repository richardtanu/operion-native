import { Tabs } from 'expo-router/js-tabs';
import { SideMenuProvider, TabBar } from '../../../components';

// The four tabs (15 Nov 2026): Home, Menu, Reports, Account. Every other
// screen is pushed on top of them, full screen with a back arrow, so the tab
// bar only shows on these four. The side menu opens from their top bar.
export default function TabsLayout() {
  return (
    <SideMenuProvider>
      <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
        <Tabs.Screen name="home" options={{ title: 'Home' }} />
        <Tabs.Screen name="menu" options={{ title: 'Menu' }} />
        <Tabs.Screen name="reports" options={{ title: 'Reports' }} />
        <Tabs.Screen name="account" options={{ title: 'Account' }} />
      </Tabs>
    </SideMenuProvider>
  );
}
