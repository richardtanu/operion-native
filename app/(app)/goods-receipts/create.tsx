import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ban } from 'lucide-react-native';
import { Button, Callout, Card, Chip, Field, KV, PhotoPicker, Row, Section, TextField, type UploadedPhoto } from '../../../components';
import { useAuth } from '../../../auth/AuthContext';
import { createGoodsReceipt, getRealisasi, listPurchaseOrders, listRealisasi } from '../../../api/procurement';
import { ApiError } from '../../../api/httpError';
import type { GoodsReceiptResponse, PurchaseOrderResponse, RealisasiResponse } from '../../../api/types';
import { useTheme } from '../../../theme/ThemeContext';
import { textStyle } from '../../../theme/typeStyle';
import { toLocalDateTime } from '../../../lib/dates';


type Via = 'po' | 'realisasi';

// PROC-05 — Goods Receipt. Exactly one of purchaseOrderId / realisasiId,
// never both — the two paths are different kinds of purchase. The receiver is
// whoever is signed in (BE-20: taken from the token). Receiving a Realisasi
// you bought yourself is allowed only with a photo of the goods; the receipt
// is flagged self-received and the store Owner is notified.
export default function CreateGoodsReceiptScreen() {
  const { color, type: typeScale, radius, border } = useTheme();
  const router = useRouter();
  const { user, token } = useAuth();
  const [via, setVia] = useState<Via>('realisasi');

  const [pos, setPos] = useState<PurchaseOrderResponse[]>([]);
  const [realisasiList, setRealisasiList] = useState<RealisasiResponse[]>([]);
  const [selectedPo, setSelectedPo] = useState<PurchaseOrderResponse | null>(null);
  const [selectedRealisasi, setSelectedRealisasi] = useState<RealisasiResponse | null>(null);

  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const [realisasiItemId, setRealisasiItemId] = useState<string | null>(null);
  const [receivedDate, setReceivedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [quantity, setQuantity] = useState('');
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GoodsReceiptResponse | null>(null);

  useEffect(() => {
    if (!token) return;
    listPurchaseOrders(token).then(setPos).catch(() => setPos([]));
    listRealisasi(token)
      .then((all) => setRealisasiList(all.filter((r) => r.status === 'APPROVED')))
      .catch(() => setRealisasiList([]));
  }, [token]);

  // DL-11: receiving against a Realisasi with no attachment on file is
  // blocked server-side. Fetch the fresh record when selected so this check
  // reflects the current attachments value, not a possibly-stale list row.
  useEffect(() => {
    if (!selectedRealisasi || !token) return;
    getRealisasi(selectedRealisasi.id, token).then(setSelectedRealisasi).catch(() => {});
  }, [selectedRealisasi?.id, token]);

  const attachmentMissing = via === 'realisasi' && selectedRealisasi && !selectedRealisasi.attachments;
  const selfReceiving = via === 'realisasi' && !!selectedRealisasi && selectedRealisasi.createdById === user?.id;

  const handleSubmit = async () => {
    setError(null);
    if (via === 'po' && !selectedPo) return setError('Select a purchase order.');
    if (via === 'realisasi' && !selectedRealisasi) return setError('Select a realisasi.');
    if (!selectedPartId) return setError('Select an item to receive.');
    if (attachmentMissing) return setError('Cannot receive — no attachment on file for this realisasi.');
    if (!receivedDate.trim()) return setError('Received date is required.');
    const receivedAt = toLocalDateTime(receivedDate);
    if (!receivedAt) return setError('Received date must be a real date in YYYY-MM-DD form.');
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) return setError('Quantity must be greater than zero.');
    if (!token || !user) return setError('Not signed in.');
    if (selfReceiving && photos.length === 0) return setError('You bought this: add a photo of the goods to receive it.');

    setSubmitting(true);
    try {
      const response = await createGoodsReceipt(
        {
          purchaseOrderId: via === 'po' ? selectedPo!.id : undefined,
          realisasiId: via === 'realisasi' ? selectedRealisasi!.id : undefined,
          goodsPhotoUploadIds: photos.length ? photos.map((ph) => ph.uploadId) : undefined,
          receivedDate: receivedAt,
          notes: notes.trim() || undefined,
          items: [{ partId: selectedPartId, realisasiItemId: via === 'realisasi' ? (realisasiItemId ?? undefined) : undefined, quantity: qty }],
        },
        token,
      );
      setResult(response);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not record this receipt.');
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: color.surface }}>
        <ScrollView contentContainerClassName="gap-md px-xl pt-xl pb-xl">
          <Text style={{ ...textStyle(typeScale.heading), color: color.ink }}>Receipt recorded</Text>
          {result.selfReceived ? <Chip label="Self-received" tone="warning" /> : null}
          {result.items.map((item) => (
            <Card key={item.id}>
              <Text style={{ ...textStyle(typeScale.body), color: color.ink }}>{item.partName}</Text>
              <View style={{ marginTop: 8, borderTopWidth: border.hair, borderTopColor: color.hair }}>
                <KV k="Received (stock units)" v={String(item.quantity)} strong />
              </View>
            </Card>
          ))}
          {result.selfReceived ? (
            <Callout tone="warning">You received your own purchase, so the store Owner has been told, with your photo.</Callout>
          ) : (
            <Callout>Stock is updated. Nobody is notified of a receipt unless the buyer received it themself.</Callout>
          )}
          <Button label="Back to Procurement" onPress={() => router.replace('/(app)/procurement')} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const items = via === 'po' ? selectedPo?.items ?? [] : selectedRealisasi?.items ?? [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.surface }}>
      <ScrollView contentContainerClassName="gap-md px-xl pt-xl pb-xl">
        <Text style={{ ...textStyle(typeScale.screenTitle), color: color.ink }}>Receive Goods</Text>

        <Row gap={0}>
          {(['realisasi', 'po'] as Via[]).map((v) => (
            <View key={v} style={{ flex: 1 }}>
              <Button
                label={v === 'po' ? 'By purchase order' : 'By realisasi'}
                variant={via === v ? 'primary' : 'secondary'}
                onPress={() => {
                  setVia(v);
                  setSelectedPartId(null);
                  setRealisasiItemId(null);
                }}
              />
            </View>
          ))}
        </Row>
        <Callout>Exactly one, never both. The two paths are different kinds of purchase, not two ways of doing one.</Callout>

        <Section>{via === 'po' ? 'Purchase order' : 'Realisasi'}</Section>
        {via === 'po'
          ? pos.map((po) => (
              <Pressable
                key={po.id}
                onPress={() => {
                  setSelectedPo(po);
                  setSelectedPartId(null);
                }}
                style={{
                  borderWidth: border.base,
                  borderColor: selectedPo?.id === po.id ? color.ink : color.hair,
                  borderRadius: radius.sm,
                  padding: 10,
                  backgroundColor: color.panel,
                }}
              >
                <Text style={{ ...textStyle(typeScale.value), color: color.ink }}>{po.poNumber}</Text>
                <Text style={{ ...textStyle(typeScale.helper), color: color.steel }}>{po.status}</Text>
              </Pressable>
            ))
          : realisasiList.map((r) => (
              <Pressable
                key={r.id}
                onPress={() => {
                  setSelectedRealisasi(r);
                  setSelectedPartId(null);
                }}
                style={{
                  borderWidth: border.base,
                  borderColor: selectedRealisasi?.id === r.id ? color.ink : color.hair,
                  borderRadius: radius.sm,
                  padding: 10,
                  backgroundColor: color.panel,
                }}
              >
                <Text style={{ ...textStyle(typeScale.value), color: color.ink }}>{r.externalOrderRef ?? r.id}</Text>
                <Text style={{ ...textStyle(typeScale.helper), color: color.steel }}>
                  {[r.sellerName ?? r.supplierName, r.channel, `bought by ${r.createdByName}`].filter(Boolean).join(' · ')}
                </Text>
              </Pressable>
            ))}

        {items.length > 0 ? (
          <>
            <Section>Item</Section>
            {items.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => {
                  setSelectedPartId(item.partId);
                  if (via === 'realisasi' && 'purchaseRequestAuthorizationItemId' in item) {
                    setRealisasiItemId(item.id);
                  }
                }}
                style={{
                  borderWidth: border.base,
                  borderColor: selectedPartId === item.partId ? color.ink : color.hair,
                  borderRadius: radius.sm,
                  padding: 10,
                  backgroundColor: color.panel,
                }}
              >
                <Text style={{ ...textStyle(typeScale.body), color: color.ink }}>{item.partName}</Text>
              </Pressable>
            ))}
          </>
        ) : null}

        <Row>
          <Field label="Received date" value={receivedDate} onChangeText={setReceivedDate} mono placeholder="YYYY-MM-DD" />
        </Row>
        <Field label="Received by" value={user?.fullName ?? 'you (current user)'} variant="derived" />
        <TextField label="Notes" value={notes} onChangeText={setNotes} placeholder="Box slightly damaged, contents intact" />
        <Field label="Quantity received (stock units)" value={quantity} onChangeText={setQuantity} mono keyboardType="numeric" />

        {attachmentMissing ? (
          <Card tone="danger">
            <View className="flex-row items-start" style={{ gap: 8 }}>
              <Ban size={17} color={color.danger} />
              <View style={{ flex: 1 }}>
                <Text style={{ ...textStyle(typeScale.cardTitle), fontSize: 15, color: color.danger }}>
                  Cannot receive — no attachment on file
                </Text>
                <Text style={{ ...textStyle(typeScale.helper), color: color.steel, marginTop: 2 }}>
                  Add the receipt to the Realisasi first. Stock does not move without it.
                </Text>
              </View>
            </View>
          </Card>
        ) : null}

        {token ? (
          <PhotoPicker
            label={selfReceiving ? 'Photo of the goods (required)' : 'Photo of the goods (optional)'}
            purpose="GOODS_RECEIPT_PHOTO"
            token={token}
            photos={photos}
            onChange={setPhotos}
            sub={
              selfReceiving
                ? 'You bought this yourself, so a photo is required. The receipt is marked self-received and the Owner is told.'
                : 'Take it when you open the package.'
            }
          />
        ) : null}

        {via === 'po' ? (
          <Callout>Orders from HQ need no receipt attachment and no receiver check: the Owner sent the order and HQ knows what it shipped.</Callout>
        ) : null}

        {error ? <Text style={{ ...textStyle(typeScale.helper), color: color.danger }}>{error}</Text> : null}

        <Button label={submitting ? 'Receiving…' : 'Receive'} onPress={handleSubmit} disabled={submitting || !!attachmentMissing} />
      </ScrollView>
    </SafeAreaView>
  );
}
