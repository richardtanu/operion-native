import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { KeyRound, Mail, Settings, Store, UserRound, Users } from 'lucide-react-native';
import { BellButton, Chip, ListGroup, ListRow, Screen, Section } from '../../../components';
import { useAuth } from '../../../auth/AuthContext';
import { canManagePeople } from '../../../auth/permissions';
import { ROLE_LABEL, scopeLabel } from '../../../lib/people';
import { useStoreInfo } from '../../../lib/useStoreInfo';
import { useTheme } from '../../../theme/ThemeContext';
import { textStyle } from '../../../theme/typeStyle';

// Account tab: the store you're signed in at, who you are, and the store's
// settings: People (an Admin, or the store's Owner for their staff), Store
// settings (the Owner changes them, others read), and your own password.
// Logging out is in the side menu.
export default function AccountScreen() {
  const { color, type: typeScale, radius, border } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const store = useStoreInfo();

  const storeCard = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: radius.pill,
          backgroundColor: color.panel,
          borderWidth: border.base,
          borderColor: color.line,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Store size={34} color={color.ink} strokeWidth={1.5} />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text numberOfLines={2} style={{ ...textStyle(typeScale.heading), fontSize: 22, color: color.ink }}>
          {store?.name ?? user?.tenantName ?? ' '}
        </Text>
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          {store ? <Chip label={store.atHq ? 'HQ' : 'Store'} tone="pending" /> : null}
          <Text style={{ ...textStyle(typeScale.helper), color: color.steel }}>{`Code ${store?.code ?? user?.tenantCode ?? '—'}`}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <Screen title="Account" leading="menu" trailing={<BellButton />} header={storeCard}>
      {user ? (
        <>
          <Section>You</Section>
          <ListGroup>
            <ListRow Icon={UserRound} title={user.fullName} subtitle={`${ROLE_LABEL[user.role]} · ${scopeLabel(user.scope)}`} />
            <ListRow Icon={Mail} title={user.email} tint={color.steel} />
          </ListGroup>
        </>
      ) : null}

      <Section>Settings</Section>
      <ListGroup>
        <ListRow
          Icon={Users}
          title="People"
          subtitle="Add people, roles and scopes, switch off, reset passwords"
          onPress={() => router.push('/(app)/users')}
          lockedFor={canManagePeople(user) ? undefined : "an Admin or the store's Owner"}
        />
        <ListRow Icon={Settings} title="Store settings" subtitle="Stock targets and maintenance limits" tint={color.info} onPress={() => router.push('/(app)/settings/store')} />
        <ListRow Icon={KeyRound} title="Change password" tint={color.tag} onPress={() => router.push('/(app)/account/password')} />
      </ListGroup>
    </Screen>
  );
}
