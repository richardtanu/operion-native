import { useCallback, useState } from 'react';
import { Link, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Callout, Card, Chip, Field, KV, Section, SelectField } from '../../../components';
import { useAuth } from '../../../auth/AuthContext';
import { canManagePerson, grantableRoles, grantableScopes } from '../../../auth/permissions';
import { listUsers, resetUserPassword, setUserActive, updateUserRole, updateUserScope } from '../../../api/users';
import { ApiError } from '../../../api/httpError';
import type { Role, Scope, UserProfileResponse } from '../../../api/types';
import { useTheme } from '../../../theme/ThemeContext';
import { textStyle } from '../../../theme/typeStyle';
import { formatDayLabel, parseLocalDateTime } from '../../../lib/dates';
import { ROLE_LABEL, SCOPE_LABEL, scopeLabel } from '../../../lib/people';


// One person (BE-31…BE-36). Scope: an Admin grants up to their own scope,
// an Owner Supervisor or Manager. Role: an Admin any, an Owner any but
// Admin. Switch off needs a reason and works at once; Reset password sets a
// temporary one they must change at their next sign-in. Nobody changes
// themself here (your own password is Change password), and an Owner can't
// touch another Owner or an Admin: HQ does that.
export default function UserScreen() {
  const { color, type: typeScale } = useTheme();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { user, token } = useAuth();
  const [person, setPerson] = useState<UserProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [scope, setScope] = useState<Scope | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [offReason, setOffReason] = useState('');
  const [tempPassword, setTempPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // There's no GET /users/{id}: the list is the caller's whole reach anyway.
  const load = useCallback(async () => {
    if (!token || !userId) return;
    setLoading(true);
    setError(null);
    try {
      const found = (await listUsers(token)).find((u) => u.id === userId) ?? null;
      setPerson(found);
      setScope(found?.scope ?? null);
      setRole(found?.role ?? null);
      if (!found) setError('This person isn’t in your list.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load this person.');
    } finally {
      setLoading(false);
    }
  }, [token, userId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const run = async (fn: () => Promise<UserProfileResponse>, done: string) => {
    setBusy(true);
    setActionError(null);
    setNotice(null);
    try {
      const updated = await fn();
      setPerson(updated);
      setScope(updated.scope);
      setRole(updated.role);
      setNotice(done);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'That didn’t work.');
    } finally {
      setBusy(false);
    }
  };

  if (!person) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: color.surface }}>
        <View className="flex-1 gap-md px-xl pt-xl">
          <Text style={{ ...textStyle(typeScale.screenTitle), color: color.ink }}>Person</Text>
          {loading ? <Text style={{ ...textStyle(typeScale.body), color: color.steel }}>Loading…</Text> : null}
          {error ? <Callout tone="danger">{error}</Callout> : null}
        </View>
      </SafeAreaView>
    );
  }

  const self = person.id === user?.id;
  const may = canManagePerson(user, person);
  const scopes = grantableScopes(user);
  const roles = grantableRoles(user);
  const switchedOffAt = parseLocalDateTime(person.deactivatedAt);

  const readOnlyWhy = self
    ? 'This is you. Nobody changes their own scope, role or switch; change your own password from the dashboard.'
    : user?.role === 'ADMIN'
      ? 'This person’s scope is above yours, so only someone at their level or higher can change them.'
      : 'Only HQ manages a store’s Owners and Admins.';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.surface }}>
      <ScrollView contentContainerClassName="gap-md px-xl pt-xl pb-xl">
        <Text style={{ ...textStyle(typeScale.screenTitle), color: color.ink }}>{person.fullName}</Text>

        <Card>
          <KV k="Email" v={person.email} />
          <KV k="Store" v={person.tenantName} />
          <KV k="Role" v={ROLE_LABEL[person.role]} />
          <KV k="Scope" v={scopeLabel(person.scope)} strong />
          <View className="flex-row flex-wrap" style={{ gap: 6, marginTop: 8 }}>
            {person.active ? <Chip label="Switched on" tone="success" /> : <Chip label="Switched off" tone="danger" />}
            {person.active && person.mustChangePassword ? <Chip label="Must change password" tone="warning" /> : null}
          </View>
          {!person.active ? (
            <Text style={{ ...textStyle(typeScale.helper), color: color.steel, marginTop: 6 }}>
              {[
                switchedOffAt ? `Switched off ${formatDayLabel(switchedOffAt)}` : 'Switched off',
                person.deactivatedByName ? `by ${person.deactivatedByName}` : null,
              ]
                .filter(Boolean)
                .join(' ')}
              {person.deactivationReason ? `: ${person.deactivationReason}` : ''}
            </Text>
          ) : null}
        </Card>

        {notice ? <Callout tone="success">{notice}</Callout> : null}
        {actionError ? <Callout tone="danger">{actionError}</Callout> : null}

        {!may ? (
          <Callout>{readOnlyWhy}</Callout>
        ) : (
          <>
            <Section>Scope</Section>
            {scopes.length === 0 ? (
              <Text style={{ ...textStyle(typeScale.helper), color: color.mute }}>
                You have no scope yourself, so you can’t grant one. HQ’s super admin grants scopes.
              </Text>
            ) : (
              <>
                <SelectField
                  value={scope}
                  placeholder="No scope"
                  items={scopes.map((s) => ({ id: s, label: SCOPE_LABEL[s] }))}
                  onChange={(id) => setScope(id as Scope)}
                />
                <Button
                  label="Save scope"
                  variant="gated"
                  gate="ADMIN·STORE OWNER"
                  disabled={busy || !scope || scope === person.scope}
                  onPress={() => run(() => updateUserScope(person.id, scope!, token!), `Scope is now ${SCOPE_LABEL[scope!]}. It applies from their next sign-in.`)}
                />
              </>
            )}

            <Section>Role</Section>
            <SelectField value={role} items={roles.map((r) => ({ id: r, label: ROLE_LABEL[r] }))} onChange={(id) => setRole(id as Role)} />
            <Button
              label="Save role"
              variant="gated"
              gate="ADMIN·STORE OWNER"
              disabled={busy || !role || role === person.role}
              onPress={() => run(() => updateUserRole(person.id, role!, token!), `Role is now ${ROLE_LABEL[role!]}. It applies from their next sign-in.`)}
            />

            <Section>Password</Section>
            <Field
              label="Temporary password"
              value={tempPassword}
              onChangeText={setTempPassword}
              secureTextEntry
              autoCapitalize="none"
              sub="8 to 72 characters. Tell them in person; they must change it at their next sign-in, and any sign-in they still have ends."
            />
            <Button
              label="Reset password"
              variant="gated"
              gate="ADMIN·STORE OWNER"
              disabled={busy || tempPassword.length < 8 || tempPassword.length > 72}
              onPress={() =>
                run(async () => {
                  const updated = await resetUserPassword(person.id, tempPassword, token!);
                  setTempPassword('');
                  return updated;
                }, 'Password reset. They choose their own at their next sign-in.')
              }
            />

            <Section>{person.active ? 'Switch off' : 'Switch on'}</Section>
            {person.active ? (
              <>
                <Field
                  label="Reason (required)"
                  value={offReason}
                  onChangeText={setOffReason}
                  placeholder="e.g. left the company on 31 Oct"
                  sub="They’re signed out at once and get no alerts. Their history stays, and anything owed to them is still paid back."
                />
                <Button
                  label="Switch off"
                  variant="gated"
                  gate="ADMIN·STORE OWNER"
                  disabled={busy || !offReason.trim()}
                  onPress={() =>
                    run(async () => {
                      const updated = await setUserActive(person.id, { active: false, reason: offReason.trim() }, token!);
                      setOffReason('');
                      return updated;
                    }, `${person.fullName} is switched off.`)
                  }
                />
              </>
            ) : (
              <Button
                label="Switch back on"
                variant="gated"
                gate="ADMIN·STORE OWNER"
                disabled={busy}
                onPress={() => run(() => setUserActive(person.id, { active: true }, token!), `${person.fullName} can sign in again.`)}
              />
            )}
          </>
        )}

        {self ? (
          <Link href="/(app)/account/password" asChild>
            <Button label="Change your password" variant="secondary" />
          </Link>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
