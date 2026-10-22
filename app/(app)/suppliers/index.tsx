import { useCallback, useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Callout, Card, Row, Section, TextField } from '../../../components';
import { useAuth } from '../../../auth/AuthContext';
import { createSupplier, listSuppliers } from '../../../api/procurement';
import { ApiError } from '../../../api/httpError';
import type { SupplierResponse } from '../../../api/types';
import { useTheme } from '../../../theme/ThemeContext';
import { textStyle } from '../../../theme/typeStyle';


// PROC-06 — Supplier Management. Suppliers are managed centrally at the
// root tenant. UserProfileResponse carries no tenant-hierarchy field, so
// this screen has no reliable client-side way to know "is my tenant root"
// before the tap — submit normally and surface the server's actual refusal
// clearly, rather than fabricating a client-side check.
export default function SuppliersScreen() {
  const { color, type: typeScale } = useTheme();
  const { token } = useAuth();
  const [suppliers, setSuppliers] = useState<SupplierResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setListError(null);
    try {
      setSuppliers(await listSuppliers(token));
    } catch (err) {
      setListError(err instanceof ApiError ? err.message : 'Could not load suppliers.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async () => {
    setError(null);
    if (!name.trim() || !contact.trim()) return setError('Name and contact are both required.');
    if (!token) return setError('Not signed in.');

    setSubmitting(true);
    try {
      await createSupplier({ name: name.trim(), contact: contact.trim() }, token);
      setName('');
      setContact('');
      await load();
    } catch (err) {
      // The server's own refusal ("Suppliers are managed centrally") is the
      // client's only signal that this tenant isn't root — surface it
      // verbatim rather than a generic error.
      setError(err instanceof ApiError ? err.message : 'Could not create this supplier.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.surface }}>
      <ScrollView contentContainerClassName="gap-md px-xl pt-xl pb-xl">
        <Text style={{ ...textStyle(typeScale.screenTitle), color: color.ink }}>Suppliers</Text>

        <Callout>
          The list always shows the root tenant's suppliers, whoever is looking. An outlet user sees head office's
          list with no indication that's what it is.
        </Callout>

        <Section>Suppliers</Section>
        {listError ? <Callout tone="danger">{listError}</Callout> : null}
        {loading ? <Text style={{ ...textStyle(typeScale.body), color: color.steel }}>Loading…</Text> : null}
        {suppliers.map((s) => (
          <Card key={s.id}>
            <Text style={{ ...textStyle(typeScale.cardTitle), color: color.ink }}>{s.name}</Text>
            <Text style={{ ...textStyle(typeScale.value), color: color.steel }}>{s.contact}</Text>
          </Card>
        ))}
        <Callout>No edit, no delete — neither exists on the backend. A row here can only ever show as read-only.</Callout>

        <Section>New supplier</Section>
        <Row>
          <TextField label="Name" value={name} onChangeText={setName} placeholder="Supplier name" />
          <TextField label="Contact" value={contact} onChangeText={setContact} placeholder="Phone or email" />
        </Row>

        <Callout tone="warning">
          Creation throws server-side unless the caller is on the root tenant. This client has no field to know that
          in advance, so the form stays enabled and the server's refusal is shown verbatim if it happens.
        </Callout>

        {error ? <Text style={{ ...textStyle(typeScale.helper), color: color.danger }}>{error}</Text> : null}

        <Button label={submitting ? 'Creating…' : 'Create supplier'} onPress={handleSubmit} disabled={submitting} />
      </ScrollView>
    </SafeAreaView>
  );
}
