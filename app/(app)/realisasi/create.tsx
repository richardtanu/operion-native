import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Callout, Card, Chip, Field, KV, Row, Section } from '../../../components';
import { useAuth } from '../../../auth/AuthContext';
import {
  approveRealisasi,
  createRealisasi,
  listPurchaseAuthorizations,
  listSuppliers,
  rejectRealisasi,
  supersedeRealisasi,
} from '../../../api/procurement';
import { ApiError } from '../../../api/httpError';
import type {
  CreateRealisasiRequest,
  PurchaseRequestAuthorizationItemResponse,
  PurchaseRequestAuthorizationResponse,
  RealisasiResponse,
  SupplierResponse,
} from '../../../api/types';
import * as tokens from '../../../theme/tokens';
import { textStyle } from '../../../theme/typeStyle';

const { color, type: typeScale } = tokens;

const STEPS = ['Receipt', 'Costs', 'Items'] as const;

const rp = (n: number | null | undefined) => (n == null ? '—' : `Rp ${Math.round(n).toLocaleString('id-ID')}`);

type PraLineOption = {
  praId: string;
  item: PurchaseRequestAuthorizationItemResponse;
};

// PROC-04 — Realisasi Entry & Review. Landed-cost entry against an active
// PRA line, not a purchase order. Split into three steps (Receipt / Costs /
// Items) rather than one long scroll — this is the module's center of
// gravity: six separate cost inputs (never one total, ~17% real-receipt
// error if collapsed), two independent status dimensions, supersede-not-
// edit correction.
export default function CreateRealisasiScreen() {
  const router = useRouter();
  const { user, token } = useAuth();
  const [step, setStep] = useState<0 | 1 | 2>(0);

  const [pras, setPras] = useState<PurchaseRequestAuthorizationResponse[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierResponse[]>([]);
  const [selectedLine, setSelectedLine] = useState<PraLineOption | null>(null);

  const [channel, setChannel] = useState('');
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentRef, setPaymentRef] = useState('');
  const [purchasedAt, setPurchasedAt] = useState('');
  const [attachments, setAttachments] = useState('');

  const [subtotal, setSubtotal] = useState('');
  const [sellerDiscount, setSellerDiscount] = useState('');
  const [platformVoucher, setPlatformVoucher] = useState('');
  const [shipping, setShipping] = useState('');
  const [insurance, setInsurance] = useState('');
  const [serviceFee, setServiceFee] = useState('');

  const [purchasedQty, setPurchasedQty] = useState('');
  const [actualUnitPrice, setActualUnitPrice] = useState('');

  const [supersedeTargetId, setSupersedeTargetId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RealisasiResponse | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) return;
    listPurchaseAuthorizations(token)
      .then((all) => setPras(all.filter((p) => p.status === 'ACTIVE' || p.status === 'PARTIALLY_FULFILLED')))
      .catch(() => setPras([]));
    listSuppliers(token)
      .then(setSuppliers)
      .catch(() => setSuppliers([]));
  }, [token]);

  const total = useMemo(() => {
    const n = (s: string) => Number(s) || 0;
    return n(subtotal) - n(sellerDiscount) - n(platformVoucher) + n(shipping) + n(insurance) + n(serviceFee);
  }, [subtotal, sellerDiscount, platformVoucher, shipping, insurance, serviceFee]);

  const resetForm = () => {
    setSelectedLine(null);
    setChannel('');
    setSupplierId(null);
    setPaymentMethod('');
    setPaymentRef('');
    setPurchasedAt('');
    setAttachments('');
    setSubtotal('');
    setSellerDiscount('');
    setPlatformVoucher('');
    setShipping('');
    setInsurance('');
    setServiceFee('');
    setPurchasedQty('');
    setActualUnitPrice('');
    setSupersedeTargetId(null);
    setStep(0);
  };

  const handleSubmit = async () => {
    setError(null);
    if (!selectedLine) return setError('Select a PRA line first (step 1).');
    if (!channel.trim()) return setError('Channel is required.');
    if (!paymentMethod.trim()) return setError('Payment method is required.');
    if (!purchasedAt.trim()) return setError('Purchased-at date is required.');
    const qty = Number(purchasedQty);
    const price = Number(actualUnitPrice);
    if (!Number.isFinite(qty) || qty <= 0) return setError('Purchased quantity must be greater than zero.');
    if (!Number.isFinite(price) || price <= 0) return setError('Unit price must be greater than zero.');
    if (!token) return setError('Not signed in.');

    const request: CreateRealisasiRequest = {
      purchaseRequestAuthorizationId: selectedLine.praId,
      channel: channel.trim(),
      supplierId: supplierId ?? undefined,
      paymentMethod: paymentMethod.trim(),
      paymentRef: paymentRef.trim() || undefined,
      purchasedAt: purchasedAt.trim(),
      subtotal: Number(subtotal) || 0,
      sellerDiscount: Number(sellerDiscount) || 0,
      platformVoucher: Number(platformVoucher) || 0,
      shipping: Number(shipping) || 0,
      insurance: Number(insurance) || 0,
      serviceFee: Number(serviceFee) || 0,
      attachments: attachments.trim() || undefined,
      items: [
        {
          purchaseRequestAuthorizationItemId: selectedLine.item.id,
          partId: selectedLine.item.partId,
          purchasedQty: qty,
          actualUnitPrice: price,
        },
      ],
    };

    setSubmitting(true);
    try {
      const response = supersedeTargetId
        ? await supersedeRealisasi(supersedeTargetId, request, token)
        : await createRealisasi(request, token);
      setResult(response);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save this realisasi.');
    } finally {
      setSubmitting(false);
    }
  };

  const runAction = async (fn: () => Promise<RealisasiResponse>) => {
    setActionError(null);
    setBusy(true);
    try {
      setResult(await fn());
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Action failed.');
    } finally {
      setBusy(false);
    }
  };

  const startSupersede = () => {
    if (!result) return;
    setSupersedeTargetId(result.id);
    setChannel(result.channel);
    setSupplierId(result.supplierId);
    setPaymentMethod(result.paymentMethod);
    setPaymentRef(result.paymentRef ?? '');
    setPurchasedAt(result.purchasedAt);
    setAttachments(result.attachments ?? '');
    setSubtotal(String(result.subtotal ?? ''));
    setSellerDiscount(String(result.sellerDiscount ?? ''));
    setPlatformVoucher(String(result.platformVoucher ?? ''));
    setShipping(String(result.shipping ?? ''));
    setInsurance(String(result.insurance ?? ''));
    setServiceFee(String(result.serviceFee ?? ''));
    const firstItem = result.items[0];
    if (firstItem) {
      setPurchasedQty(String(firstItem.purchasedQty));
      setActualUnitPrice(String(firstItem.actualUnitPrice ?? ''));
    }
    setResult(null);
    setStep(0);
  };

  const ownerPlus = user?.scope === 'OWNER' || user?.scope === 'PRINCIPAL';

  if (result) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: color.surface }}>
        <ScrollView contentContainerClassName="gap-md px-xl pt-xl pb-xl">
          <Text style={{ ...textStyle(typeScale.heading), color: color.ink }}>Realisasi saved</Text>

          <View className="flex-row flex-wrap" style={{ gap: 6 }}>
            <Chip label={result.status} tone={result.status === 'FAILED' ? 'danger' : result.status === 'APPROVED' ? 'success' : 'pending'} />
            <Chip label={result.varianceStatus} tone={result.varianceStatus === 'ESCALATED' ? 'danger' : 'neutral'} solid={result.varianceStatus === 'ESCALATED'} />
            {result.reimbursementStatus ? <Chip label={`Reimb. ${result.reimbursementStatus}`} tone="warning" /> : null}
          </View>

          {result.varianceStatus === 'ESCALATED' && result.status === 'PENDING_APPROVAL' ? (
            <Callout tone="warning">
              Only escalated purchases need this. A purchase inside the ceiling auto-approves at creation — no
              approval step, nothing to tap.
            </Callout>
          ) : null}

          {result.items.map((item) => (
            <Card key={item.id}>
              <Text style={{ ...textStyle(typeScale.body), color: color.ink }}>{item.partName}</Text>
              <View style={{ marginTop: 8, borderTopWidth: tokens.border.hair, borderTopColor: color.hair }}>
                <KV k={`Purchased (${item.purchaseUom})`} v={String(item.purchasedQty)} strong />
                <KV k="Allocated landed cost" v={rp(item.allocatedLandedCost)} derived />
              </View>
            </Card>
          ))}

          <Card>
            <Text style={{ ...textStyle(typeScale.fieldLabel), color: color.mute }}>Total cost — computed, never entered</Text>
            <Text style={{ ...textStyle(typeScale.valueLarge), color: color.ink }}>{rp(result.totalCost)}</Text>
          </Card>

          {result.reimbursementStatus === 'PENDING' ? (
            <Callout tone="warning">Nothing tappable beside Reimbursement — no mark-reimbursed endpoint exists.</Callout>
          ) : null}

          {actionError ? <Callout tone="danger">{actionError}</Callout> : null}

          {result.status === 'PENDING_APPROVAL' ? (
            <Row>
              <View style={{ flex: 1 }}>
                <Button label="Approve" variant="gated" gate="OWNER+" disabled={!ownerPlus || busy} onPress={() => runAction(() => approveRealisasi(result.id, token!))} />
              </View>
              <View style={{ flex: 1 }}>
                <Button label="Reject" variant="secondary" disabled={busy} onPress={() => runAction(() => rejectRealisasi(result.id, token!))} />
              </View>
            </Row>
          ) : null}
          <Button label="Supersede (correct this record)" variant="secondary" onPress={startSupersede} />
          <Callout>
            Supersede is replacement, not edit: the original stays visible read-only, the correction is a full new
            record linked by supersedesId, and the ceiling reopens the moment the original flips.
          </Callout>

          <Button label="New realisasi" variant="secondary" onPress={resetForm} />
          <Button label="Back to Procurement" onPress={() => router.replace('/(app)/procurement')} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.surface }}>
      <ScrollView contentContainerClassName="gap-md px-xl pt-xl pb-xl">
        <Text style={{ ...textStyle(typeScale.screenTitle), color: color.ink }}>
          {supersedeTargetId ? 'Supersede Realisasi' : 'New Realisasi'}
        </Text>

        <View className="flex-row" style={{ gap: 4 }}>
          {STEPS.map((s, i) => (
            <Button key={s} label={`${i + 1}. ${s}`} variant={step === i ? 'primary' : 'secondary'} onPress={() => setStep(i as 0 | 1 | 2)} style={{ flex: 1 }} />
          ))}
        </View>

        {step === 0 ? (
          <>
            <Section>PRA line</Section>
            {pras.flatMap((p) => p.items.map((item) => ({ praId: p.id, item }))).length === 0 ? (
              <Text style={{ ...textStyle(typeScale.body), color: color.mute }}>No active PRA lines found.</Text>
            ) : (
              pras
                .flatMap((p) => p.items.map((item) => ({ praId: p.id, item })))
                .map((opt) => (
                  <Pressable
                    key={opt.item.id}
                    onPress={() => setSelectedLine(opt)}
                    style={{
                      borderWidth: tokens.border.base,
                      borderColor: selectedLine?.item.id === opt.item.id ? color.ink : color.hair,
                      borderRadius: tokens.radius.sm,
                      padding: 10,
                      backgroundColor: color.panel,
                    }}
                  >
                    <Text style={{ ...textStyle(typeScale.body), color: color.ink }}>{opt.item.partName}</Text>
                    <Text style={{ ...textStyle(typeScale.helper), color: color.steel }}>
                      PRA {opt.praId} · remaining {opt.item.remainingQty}
                    </Text>
                  </Pressable>
                ))
            )}

            <Row>
              <Field label="Channel" value={channel} onChangeText={setChannel} placeholder="Marketplace" />
            </Row>
            <Section>Supplier</Section>
            {suppliers.length === 0 ? (
              <Text style={{ ...textStyle(typeScale.body), color: color.mute }}>No suppliers found.</Text>
            ) : (
              suppliers.map((s) => (
                <Pressable
                  key={s.id}
                  onPress={() => setSupplierId(s.id)}
                  style={{
                    borderWidth: tokens.border.base,
                    borderColor: supplierId === s.id ? color.ink : color.hair,
                    borderRadius: tokens.radius.sm,
                    padding: 10,
                    backgroundColor: color.panel,
                  }}
                >
                  <Text style={{ ...textStyle(typeScale.body), color: color.ink }}>{s.name}</Text>
                </Pressable>
              ))
            )}

            <Row>
              <Field label="Payment method" value={paymentMethod} onChangeText={setPaymentMethod} placeholder="PERSONAL_REIMBURSABLE" />
              <Field label="Payment ref" value={paymentRef} onChangeText={setPaymentRef} mono placeholder="TRX-93921" />
            </Row>
            <Row>
              <Field label="Purchased at" value={purchasedAt} onChangeText={setPurchasedAt} mono placeholder="YYYY-MM-DD" />
            </Row>
            <Field label="Attachment" value={attachments} onChangeText={setAttachments} mono placeholder="https://…" sub="URL field, not a file picker — no upload backing exists" />
            <Callout>
              Optional here on purpose, so an urgent purchase is never blocked from being logged. Goods receipt
              refuses to run without it.
            </Callout>
          </>
        ) : null}

        {step === 1 ? (
          <>
            <Section>Landed cost — six separate inputs</Section>
            <Row>
              <Field label="Subtotal" value={subtotal} onChangeText={setSubtotal} mono keyboardType="numeric" />
              <Field label="− Seller discount" value={sellerDiscount} onChangeText={setSellerDiscount} mono keyboardType="numeric" />
            </Row>
            <Row>
              <Field label="− Platform voucher" value={platformVoucher} onChangeText={setPlatformVoucher} mono keyboardType="numeric" />
              <Field label="+ Shipping" value={shipping} onChangeText={setShipping} mono keyboardType="numeric" />
            </Row>
            <Row>
              <Field label="+ Insurance" value={insurance} onChangeText={setInsurance} mono keyboardType="numeric" />
              <Field label="+ Service fee" value={serviceFee} onChangeText={setServiceFee} mono keyboardType="numeric" />
            </Row>
            <Card>
              <Text style={{ ...textStyle(typeScale.fieldLabel), color: color.mute }}>Total cost — computed, never entered</Text>
              <Text style={{ ...textStyle(typeScale.valueLarge), color: color.ink }}>{rp(total)}</Text>
            </Card>
            <Callout>
              Six inputs rather than one price because the allocation policy has to stay changeable — a single total
              field is wrong even though it looks cleaner.
            </Callout>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <Section>Item</Section>
            {selectedLine ? (
              <Card>
                <Text style={{ ...textStyle(typeScale.body), color: color.ink }}>{selectedLine.item.partName}</Text>
                <View style={{ marginTop: 9 }}>
                  <Row>
                    <Field label="Qty (purchase UOM)" value={purchasedQty} onChangeText={setPurchasedQty} mono keyboardType="numeric" />
                    <Field label="Unit price" value={actualUnitPrice} onChangeText={setActualUnitPrice} mono keyboardType="numeric" />
                  </Row>
                </View>
              </Card>
            ) : (
              <Callout tone="warning">Select a PRA line in step 1 first.</Callout>
            )}

            <Callout tone="warning">
              Only escalated purchases go to PENDING_APPROVAL. A purchase inside the ceiling auto-approves the moment
              it's created.
            </Callout>
          </>
        ) : null}

        {error ? <Text style={{ ...textStyle(typeScale.helper), color: color.danger }}>{error}</Text> : null}

        <Button label={submitting ? 'Saving…' : supersedeTargetId ? 'Save correction' : 'Create'} onPress={handleSubmit} disabled={submitting} />
      </ScrollView>
    </SafeAreaView>
  );
}
