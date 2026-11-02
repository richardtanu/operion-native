import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Callout, Card, Chip, Field, FieldLabel, Row } from '../../../components';
import { useAuth } from '../../../auth/AuthContext';
import { canManageHqCatalog } from '../../../auth/permissions';
import {
  createCategory,
  createPartType,
  deleteCategory,
  deletePartType,
  listAllPartTypes,
  listCategories,
  updateCategory,
  updatePartType,
} from '../../../api/parts';
import { getTenantTree } from '../../../api/tenants';
import { ApiError } from '../../../api/httpError';
import type { PartCategoryResponse, PartTypeResponse } from '../../../api/types';
import { useTheme } from '../../../theme/ThemeContext';
import { textStyle } from '../../../theme/typeStyle';


const countedAs = (consumable: boolean | null) => (consumable ? 'Consumable · counted by quantity' : 'Spare part · tracked one by one');

type CategoryForm = { name: string; description: string; consumable: boolean };
const EMPTY_FORM: CategoryForm = { name: '', description: '', consumable: true };

// INV-07 — Categories and types (BE-29). One list, HQ's, read by every
// store; only HQ admins (Admin role or Principal, signed in at HQ) change
// it. A category's "consumable" flag decides how every item in it is
// counted in every store, so flipping it carries a warning. A category or
// type still in use can't be deleted (the server says so).
export default function CategoriesScreen() {
  const { color, type: typeScale } = useTheme();
  const { user, token } = useAuth();
  const [categories, setCategories] = useState<PartCategoryResponse[]>([]);
  const [types, setTypes] = useState<PartTypeResponse[]>([]);
  const [atHq, setAtHq] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CategoryForm>(EMPTY_FORM);
  const [typeNames, setTypeNames] = useState<Record<string, string>>({});
  const [newType, setNewType] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [cats, allTypes, tree] = await Promise.all([listCategories(token), listAllPartTypes(token), getTenantTree(token)]);
      setCategories(cats.sort((a, b) => a.name.localeCompare(b.name)));
      setTypes(allTypes.sort((a, b) => a.name.localeCompare(b.name)));
      setAtHq(!!tree[0] && tree[0].parentId == null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load categories.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const mayEdit = canManageHqCatalog(user, atHq);

  const run = async (fn: () => Promise<unknown>, after?: () => void) => {
    if (!token) return;
    setBusy(true);
    setActionError(null);
    try {
      await fn();
      after?.();
      await load();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'That didn’t work.');
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (c: PartCategoryResponse) => {
    setAdding(false);
    setEditingId(c.id);
    setForm({ name: c.name, description: c.description ?? '', consumable: !!c.consumable });
    setTypeNames(Object.fromEntries(types.filter((t) => t.categoryId === c.id).map((t) => [t.id, t.name])));
    setNewType('');
    setActionError(null);
  };

  const closeEditor = () => {
    setAdding(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setNewType('');
  };

  const editing = categories.find((c) => c.id === editingId) ?? null;
  const flagChanging = !!editing && !!editing.consumable !== form.consumable;

  const categoryFields = (
    <>
      <Field label="Name" value={form.name} onChangeText={(name) => setForm((f) => ({ ...f, name }))} placeholder="e.g. Gas" />
      <Field label="Description" value={form.description} onChangeText={(description) => setForm((f) => ({ ...f, description }))} placeholder="Optional" />
      <View style={{ gap: 6 }}>
        <FieldLabel>How items are counted</FieldLabel>
        <Row gap={0}>
          {[true, false].map((consumable) => (
            <View key={String(consumable)} style={{ flex: 1 }}>
              <Button
                label={consumable ? 'By quantity' : 'One by one'}
                variant={form.consumable === consumable ? 'primary' : 'secondary'}
                onPress={() => setForm((f) => ({ ...f, consumable }))}
              />
            </View>
          ))}
        </Row>
        <Text style={{ ...textStyle(typeScale.helper), color: flagChanging ? color.warn : color.mute }}>
          {flagChanging
            ? 'This changes how every item in this category is counted, in every store, from now on.'
            : 'By quantity: consumables like BBs and gas. One by one: spare parts, each tracked as a unit.'}
        </Text>
      </View>
    </>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.surface }}>
      <ScrollView contentContainerClassName="gap-md px-xl pt-xl pb-xl">
        <Text style={{ ...textStyle(typeScale.screenTitle), color: color.ink }}>Categories</Text>
        <Text style={{ ...textStyle(typeScale.helper), color: color.steel }}>
          One list, kept by HQ, used by every store. {mayEdit ? '' : 'Ask HQ to add or change one.'}
        </Text>

        {error ? <Callout tone="danger">{error}</Callout> : null}
        {actionError ? <Callout tone="danger">{actionError}</Callout> : null}
        {loading && categories.length === 0 ? <Text style={{ ...textStyle(typeScale.body), color: color.steel }}>Loading…</Text> : null}

        {mayEdit && !adding && !editingId ? (
          <Button
            label="Add category"
            variant="gated"
            gate="HQ ADMIN"
            onPress={() => {
              setForm(EMPTY_FORM);
              setAdding(true);
            }}
          />
        ) : null}

        {adding ? (
          <Card>
            <View style={{ gap: 10 }}>
              {categoryFields}
              <Row>
                <View style={{ flex: 1 }}>
                  <Button label="Cancel" variant="secondary" onPress={closeEditor} />
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    label="Add"
                    variant="gated"
                    gate="HQ ADMIN"
                    disabled={busy || !form.name.trim()}
                    onPress={() =>
                      run(
                        () => createCategory({ name: form.name.trim(), description: form.description.trim() || undefined, consumable: form.consumable }, token!),
                        closeEditor,
                      )
                    }
                  />
                </View>
              </Row>
            </View>
          </Card>
        ) : null}

        {!loading && !error && categories.length === 0 ? (
          <Text style={{ ...textStyle(typeScale.body), color: color.mute }}>No categories yet.</Text>
        ) : null}

        {categories.map((c) => {
          const own = types.filter((t) => t.categoryId === c.id);
          if (editingId === c.id) {
            return (
              <Card key={c.id}>
                <View style={{ gap: 10 }}>
                  {categoryFields}
                  <Button
                    label="Save category"
                    variant="gated"
                    gate="HQ ADMIN"
                    disabled={busy || !form.name.trim()}
                    onPress={() =>
                      run(() => updateCategory(c.id, { name: form.name.trim(), description: form.description.trim(), consumable: form.consumable }, token!))
                    }
                  />

                  <FieldLabel>Types</FieldLabel>
                  {own.map((t) => (
                    <View key={t.id} className="flex-row items-end" style={{ gap: 8 }}>
                      <View style={{ flex: 1 }}>
                        <Field value={typeNames[t.id] ?? t.name} onChangeText={(v) => setTypeNames((n) => ({ ...n, [t.id]: v }))} />
                      </View>
                      <Button
                        label="Rename"
                        variant="secondary"
                        disabled={busy || !(typeNames[t.id] ?? '').trim() || typeNames[t.id] === t.name}
                        onPress={() => run(() => updatePartType(t.id, { name: typeNames[t.id].trim() }, token!))}
                        style={{ paddingVertical: 8 }}
                      />
                      <Button label="Delete" variant="secondary" disabled={busy} onPress={() => run(() => deletePartType(t.id, token!))} style={{ paddingVertical: 8 }} />
                    </View>
                  ))}
                  <View className="flex-row items-end" style={{ gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Field value={newType} onChangeText={setNewType} placeholder="New type, e.g. Green gas" />
                    </View>
                    <Button
                      label="Add type"
                      variant="secondary"
                      disabled={busy || !newType.trim()}
                      onPress={() => run(() => createPartType({ categoryId: c.id, name: newType.trim() }, token!), () => setNewType(''))}
                      style={{ paddingVertical: 8 }}
                    />
                  </View>

                  <Row>
                    <View style={{ flex: 1 }}>
                      <Button label="Done" variant="secondary" onPress={closeEditor} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Button label="Delete category" variant="gated" gate="HQ ADMIN" disabled={busy} onPress={() => run(() => deleteCategory(c.id, token!), closeEditor)} />
                    </View>
                  </Row>
                  <Text style={{ ...textStyle(typeScale.helper), color: color.mute }}>
                    A category or type that any store’s item still uses can’t be deleted.
                  </Text>
                </View>
              </Card>
            );
          }
          return (
            <Card key={c.id}>
              <View className="flex-row items-start justify-between" style={{ gap: 8 }}>
                <Text style={{ ...textStyle(typeScale.cardTitle), color: color.ink, flex: 1 }}>{c.name}</Text>
                <Chip label={c.consumable ? 'By quantity' : 'One by one'} />
              </View>
              <Text style={{ ...textStyle(typeScale.helper), color: color.steel }}>
                {[countedAs(c.consumable), c.description].filter(Boolean).join(' · ')}
              </Text>
              <Text style={{ ...textStyle(typeScale.body), color: own.length ? color.ink : color.mute, marginTop: 6 }}>
                {own.length ? own.map((t) => t.name).join(', ') : 'No types yet.'}
              </Text>
              {mayEdit && !adding && !editingId ? (
                <View style={{ marginTop: 8 }}>
                  <Button label="Edit" variant="secondary" onPress={() => startEdit(c)} style={{ paddingVertical: 8 }} />
                </View>
              ) : null}
            </Card>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
