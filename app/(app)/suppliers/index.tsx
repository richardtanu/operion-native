import { useCallback, useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Lock } from 'lucide-react-native';
import { Button, Callout, Card, Chip, Row, Section, TextField } from '../../../components';
import { useAuth } from '../../../auth/AuthContext';
import { createSupplier, listSuppliers } from '../../../api/procurement';
import { getTenantTree } from '../../../api/tenants';
import { ApiError } from '../../../api/httpError';
import type { SupplierResponse } from '../../../api/types';
import { useTheme } from '../../../theme/ThemeContext';
import { textStyle } from '../../../theme/typeStyle';


// PROC-06 — Suppliers. Suppliers are HQ's (decision #7, BE-21): every store
// sees HQ's list on purpose, labelled "Managed by HQ", and only HQ (the root
// tenant) can add one. GET /tenants/tree tells us whether we're at the root:
// the caller's own tenant comes first and has no parent there.
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
  const [atHq, setAtHq] = useState(false);

  useEffect(() => {
    if (!token) return;
    getTenantTree(token)
      .then((tree) => setAtHq(!!tree[0] && tree[0].parentId == null))
      .catch(() => setAtHq(false));
  }, [token]);

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

        <Section>Suppliers · managed by HQ</Section>
        {listError ? <Callout tone="danger">{listError}</Callout> : null}
        {loading ? <Text style={{ ...textStyle(typeScale.body), color: color.steel }}>Loading…</Text> : null}
        {suppliers.map((s) => (
          <Card key={s.id}>
            <View className="flex-row items-center justify-between" style={{ gap: 8 }}>
              <Text style={{ ...textStyle(typeScale.cardTitle), color: color.ink, flex: 1 }}>{s.name}</Text>
              {s.franchiseCentre ? <Chip label="HQ · sells to stores" tone="pending" /> : null}
            </View>
            <Text style={{ ...textStyle(typeScale.value), color: color.steel }}>{s.contact}</Text>
          </Card>
        ))}
        <Text style={{ ...textStyle(typeScale.helper), color: color.mute }}>
          Read-only: suppliers can't be edited or deleted. Buying somewhere else? Name the seller on the purchase itself.
        </Text>

        {atHq ? (
          <>
            <Section>New supplier</Section>
            <Row>
              <TextField label="Name" value={name} onChangeText={setName} placeholder="Supplier name" />
              <TextField label="Contact" value={contact} onChangeText={setContact} placeholder="Phone or email" />
            </Row>
            {error ? <Text style={{ ...textStyle(typeScale.helper), color: color.danger }}>{error}</Text> : null}
            <Button label={submitting ? 'Creating…' : 'Create supplier'} onPress={handleSubmit} disabled={submitting} />
          </>
        ) : (
          <Card>
            <View className="flex-row items-start" style={{ gap: 8 }}>
              <Lock size={16} color={color.steel} />
              <Text style={{ ...textStyle(typeScale.helper), color: color.steel, flex: 1 }}>
                Only HQ adds suppliers. For a purchase from somewhere else, write the seller's name on the purchase.
              </Text>
            </View>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
