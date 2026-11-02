import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Callout, Card, Field, KV, SelectField } from '../../../components';
import { useAuth } from '../../../auth/AuthContext';
import { canManagePeople } from '../../../auth/permissions';
import { listUsers, registerUser } from '../../../api/users';
import { getTenantTree } from '../../../api/tenants';
import { ApiError } from '../../../api/httpError';
import type { TenantResponse } from '../../../api/types';
import { useTheme } from '../../../theme/ThemeContext';
import { textStyle } from '../../../theme/typeStyle';


// Add a person (BE-12, BE-34, BE-36). An Admin adds anyone into a store in
// their tree; a store's Owner into their own store only. Everyone starts as
// an Operator with no scope — give them a scope and role next — and changes
// the first password at their first sign-in.
export default function AddPersonScreen() {
  const { color, type: typeScale } = useTheme();
  const router = useRouter();
  const { user, token } = useAuth();
  const allowed = canManagePeople(user);
  const isAdmin = user?.role === 'ADMIN';

  const [stores, setStores] = useState<TenantResponse[]>([]);
  const [storeCode, setStoreCode] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState<{ name: string; email: string; store: string } | null>(null);

  useEffect(() => {
    if (!token) return;
    getTenantTree(token)
      .then((tree) => {
        setStores(tree);
        setStoreCode(tree[0]?.code ?? null);
      })
      .catch(() => setStores([]));
  }, [token]);

  const store = stores.find((t) => t.code === storeCode) ?? null;

  const handleSubmit = async () => {
    setError(null);
    if (!fullName.trim()) return setError('Enter their full name.');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Enter a real email address.');
    if (password.length < 8 || password.length > 72) return setError('The first password must be 8 to 72 characters.');
    if (!token) return setError('Not signed in.');

    setSubmitting(true);
    try {
      // The token that comes back is the new person's own: not ours to keep.
      await registerUser({ fullName: fullName.trim(), email: email.trim(), password, tenantCode: storeCode ?? undefined }, token);
      setAdded({ name: fullName.trim(), email: email.trim(), store: store?.name ?? '' });
      setFullName('');
      setEmail('');
      setPassword('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not add this person.');
    } finally {
      setSubmitting(false);
    }
  };

  // Register returns no id: find them by email to open their page.
  const openAdded = async () => {
    if (!token || !added) return;
    try {
      const found = (await listUsers(token)).find((u) => u.email.toLowerCase() === added.email.toLowerCase());
      if (found) router.replace({ pathname: '/(app)/users/[userId]', params: { userId: found.id } });
      else router.back();
    } catch {
      router.back();
    }
  };

  if (added) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: color.surface }}>
        <View className="flex-1 gap-lg px-xl pt-xl">
          <Text style={{ ...textStyle(typeScale.heading), color: color.ink }}>Person added</Text>
          <Card>
            <KV k="Name" v={added.name} />
            <KV k="Email" v={added.email} />
            {added.store ? <KV k="Store" v={added.store} /> : null}
            <KV k="Starts as" v="Operator, no scope" />
          </Card>
          <Text style={{ ...textStyle(typeScale.body), color: color.steel }}>
            Give them a scope and a role next. Tell them the first password in person; they choose their own at their
            first sign-in.
          </Text>
          <Button label={`Open ${added.name}`} onPress={openAdded} />
          <Button label="Add another" variant="secondary" onPress={() => setAdded(null)} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.surface }}>
      <ScrollView contentContainerClassName="gap-md px-xl pt-xl pb-xl">
        <Text style={{ ...textStyle(typeScale.screenTitle), color: color.ink }}>Add a person</Text>

        {!allowed ? <Callout tone="warning">Only an Admin or the store’s Owner adds people.</Callout> : null}

        {isAdmin && stores.length > 1 ? (
          <SelectField
            label="Store"
            value={storeCode}
            items={stores.map((t) => ({ id: t.code, label: t.name, sublabel: t.code }))}
            onChange={setStoreCode}
          />
        ) : store ? (
          <Text style={{ ...textStyle(typeScale.helper), color: color.steel }}>{`Joins ${store.name}.`}</Text>
        ) : null}

        <Field label="Full name" value={fullName} onChangeText={setFullName} placeholder="e.g. Rina Wijaya" />
        <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="rina@example.com" />
        <Field
          label="First password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          sub="8 to 72 characters. They must change it at their first sign-in."
        />

        {!isAdmin ? (
          <Callout>You add people to your own store. HQ adds a store’s Owners and Admins.</Callout>
        ) : null}

        {error ? <Callout tone="danger">{error}</Callout> : null}

        <Button
          label={submitting ? 'Adding…' : 'Add person'}
          variant="gated"
          gate="ADMIN·STORE OWNER"
          disabled={submitting || !allowed}
          onPress={handleSubmit}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
