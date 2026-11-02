import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Button,
  Callout,
  Card,
  Chip,
  Field,
  FieldLabel,
  KV,
  PhotoPicker,
  Row,
  Section,
  SelectField,
  StepTabs,
  type StepState,
  type UploadedPhoto,
} from '../../../components';
import { useAuth } from '../../../auth/AuthContext';
import {
  approveRealisasi,
  createRealisasi,
  listPurchaseAuthorizations,
  listSuppliers,
  rejectRealisasi,
  supersedeRealisasi,
} from '../../../api/procurement';
import { listParts } from '../../../api/parts';
import { getTenantTree } from '../../../api/tenants';
import { viewUpload } from '../../../api/uploads';
import { canBuyForAnotherStore, canLogPurchase, ownerPlus as isOwnerPlus } from '../../../auth/permissions';
import { ApiError } from '../../../api/httpError';
import type {
  CreateRealisasiRequest,
  PaymentMethod,
  PurchaseRequestAuthorizationItemResponse,
  PurchaseRequestAuthorizationResponse,
  RealisasiResponse,
  SupplierResponse,
  TenantResponse,
} from '../../../api/types';
import { useTheme } from '../../../theme/ThemeContext';
import { textStyle } from '../../../theme/typeStyle';
import { formatDayLabel, formatTime, toLocalDateTime } from '../../../lib/dates';
import {
  deleteDraft,
  draftAgeDays,
  listDrafts,
  saveDraft,
  STALE_DRAFT_DAYS,
  type RealisasiDraft,
  type RealisasiDraftForm,
} from '../../../drafts/realisasiDrafts';


const STEPS = ['Receipt', 'Costs', 'Items'] as const;
type Step = 0 | 1 | 2;

const rp = (n: number | null | undefined) => (n == null ? '—' : `Rp ${Math.round(n).toLocaleString('id-ID')}`);

type PraLineOption = {
  praId: string;
  tenantName: string;
  item: PurchaseRequestAuthorizationItemResponse;
};

// Every value the user types, as text — what a draft stores and what a
// correction compares against the original.
type FormText = Omit<RealisasiDraftForm, 'praId' | 'praItemId' | 'partName' | 'supplierId' | 'boughtAtHq' | 'storeId'>;
type TextKey = keyof FormText;

const EMPTY_TEXT: FormText = {
  channel: '',
  sellerName: '',
  paymentMethod: '',
  paymentRef: '',
  purchasedAt: '',
  attachments: '',
  subtotal: '',
  sellerDiscount: '',
  platformVoucher: '',
  shipping: '',
  insurance: '',
  serviceFee: '',
  purchasedQty: '',
  actualUnitPrice: '',
};

const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  COMPANY_ACCOUNT: 'Store’s account',
  PERSONAL_REIMBURSABLE: 'Paid by me',
};

type ErrorKey = TextKey | 'praLine' | 'store' | 'receipt';
const STEP_OF: Record<ErrorKey, Step> = {
  praLine: 0,
  store: 0,
  receipt: 0,
  sellerName: 0,
  channel: 0,
  paymentMethod: 0,
  paymentRef: 0,
  purchasedAt: 0,
  attachments: 0,
  subtotal: 1,
  sellerDiscount: 1,
  platformVoucher: 1,
  shipping: 1,
  insurance: 1,
  serviceFee: 1,
  purchasedQty: 2,
  actualUnitPrice: 2,
};

/** What's missing or wrong, per field. Empty object = ready to create. */
type Rules = {
  hasLine: boolean;
  /** The chosen line is a mandatory HQ item but the purchase isn't from HQ (BE-21). */
  mandatoryOutsideHq: boolean;
  boughtAtHq: boolean;
  /** HQ Procurement must say which store they're buying for (BE-17). */
  needsStore: boolean;
  /** Paid by me with no receipt photo, and no original's photo to rely on (BE-40). */
  needsReceipt: boolean;
};

function validate(text: FormText, r: Rules): Partial<Record<ErrorKey, string>> {
  const errors: Partial<Record<ErrorKey, string>> = {};
  const required = 'Required.';
  if (r.needsStore) errors.store = 'Pick the store you bought this for.';
  if (!r.hasLine) errors.praLine = 'Pick the PRA line this purchase is against.';
  else if (r.mandatoryOutsideHq) errors.praLine = 'This item must be bought from HQ. Choose “At HQ” below, or order it from HQ.';
  if (!r.boughtAtHq && !text.sellerName.trim()) errors.sellerName = 'Say where you bought it, e.g. “Shopee · Toko Airsoft Jaya”.';
  if (!text.channel.trim()) errors.channel = required;
  // An older draft may hold free text here, from before this was a choice.
  if (!(text.paymentMethod in PAYMENT_LABEL)) errors.paymentMethod = 'Say who paid.';
  if (r.needsReceipt) errors.receipt = 'Add a photo of the receipt: it’s what you’re paid back against.';
  if (!text.purchasedAt.trim()) errors.purchasedAt = required;
  else if (!toLocalDateTime(text.purchasedAt)) errors.purchasedAt = 'Use a real date, YYYY-MM-DD.';

  const subtotal = Number(text.subtotal);
  if (!text.subtotal.trim()) errors.subtotal = required;
  else if (!Number.isFinite(subtotal) || subtotal <= 0) errors.subtotal = 'Enter an amount above zero.';
  for (const k of ['sellerDiscount', 'platformVoucher', 'shipping', 'insurance', 'serviceFee'] as const) {
    const v = text[k].trim();
    if (v && (!Number.isFinite(Number(v)) || Number(v) < 0)) errors[k] = 'Enter a number, or leave it empty.';
  }

  for (const k of ['purchasedQty', 'actualUnitPrice'] as const) {
    const v = text[k].trim();
    if (!v) errors[k] = required;
    else if (!Number.isFinite(Number(v)) || Number(v) <= 0) errors[k] = 'Enter a number above zero.';
  }
  return errors;
}

// PROC-04 — Realisasi Entry & Review. Landed-cost entry against an active
// PRA line, not a purchase order. Three free tabs (Receipt / Costs / Items)
// that report their own state; Create checks every step and jumps to the
// first one with a problem (decision #11). Six separate cost inputs (never
// one total), two independent status dimensions, supersede-not-edit
// correction. Half-finished purchases can be saved as drafts on this phone.
// Receipt photos (BE-39) are required when paid by me (BE-40) — the Owner
// pays you back against them — unless a correction's original has them.
export default function CreateRealisasiScreen() {
  const { color, type: typeScale, radius, border } = useTheme();
  const router = useRouter();
  const { user, token } = useAuth();
  const [step, setStep] = useState<Step>(0);

  const [pras, setPras] = useState<PurchaseRequestAuthorizationResponse[]>([]);
  const [prasLoaded, setPrasLoaded] = useState(false);
  // A draft's PRA line, waiting for the PRA list to arrive before it can be matched.
  const [pendingLine, setPendingLine] = useState<{ praId: string; itemId: string } | null>(null);
  const [suppliers, setSuppliers] = useState<SupplierResponse[]>([]);
  const [selectedLine, setSelectedLine] = useState<PraLineOption | null>(null);
  const [supplierId, setSupplierId] = useState<string | null>(null);
  // BE-21: bought at HQ (paid on the spot) sends the franchise-centre supplier; anywhere else, a free-text seller.
  const [boughtAtHq, setBoughtAtHq] = useState(false);
  const [mandatoryParts, setMandatoryParts] = useState<Set<string>>(new Set());
  const [stores, setStores] = useState<TenantResponse[]>([]);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [text, setText] = useState<FormText>(EMPTY_TEXT);
  const set = (k: TextKey) => (v: string) => setText((t) => ({ ...t, [k]: v }));
  // Uploaded as soon as they're picked; not kept in a draft (an unattached
  // upload is swept after 24 hours, a draft can wait days).
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  // A correction may rely on the original's receipt photos (BE-40).
  const [originalReceipts, setOriginalReceipts] = useState(0);

  // Set once Create has been pressed: only then do gaps show as errors.
  const [attempted, setAttempted] = useState(false);

  const [supersedeTargetId, setSupersedeTargetId] = useState<string | null>(null);
  const [original, setOriginal] = useState<FormText | null>(null);
  const [supersedeReason, setSupersedeReason] = useState('');

  const [drafts, setDrafts] = useState<RealisasiDraft[]>([]);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [draftNotice, setDraftNotice] = useState<string | null>(null);
  const [discardArmed, setDiscardArmed] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RealisasiResponse | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) return;
    listPurchaseAuthorizations(token)
      .then((all) => setPras(all.filter((p) => p.status === 'ACTIVE' || p.status === 'PARTIALLY_FULFILLED')))
      .catch(() => setPras([]))
      .finally(() => setPrasLoaded(true));
    listSuppliers(token)
      .then(setSuppliers)
      .catch(() => setSuppliers([]));
    listParts(token)
      .then((parts) => setMandatoryParts(new Set(parts.filter((pt) => pt.mandatoryFromHq).map((pt) => pt.id))))
      .catch(() => setMandatoryParts(new Set()));
    getTenantTree(token)
      .then(setStores)
      .catch(() => setStores([]));
  }, [token]);

  const centre = suppliers.find((sp) => sp.franchiseCentre) ?? null;
  const picksStore = canBuyForAnotherStore(user) && stores.length > 1;

  const refreshDrafts = useCallback(() => {
    if (!user) return;
    listDrafts(user.id)
      .then(setDrafts)
      .catch(() => setDrafts([]));
  }, [user]);

  useEffect(() => {
    refreshDrafts();
  }, [refreshDrafts]);

  // HQ buying for a store sees only that store's limits (BE-26 put the store on each PRA).
  const lineOptions = useMemo(
    () =>
      pras
        .filter((p) => !picksStore || !storeId || p.tenantId === storeId)
        .flatMap((p) => p.items.map((item) => ({ praId: p.id, tenantName: p.tenantName, item }))),
    [pras, picksStore, storeId],
  );

  useEffect(() => {
    if (!pendingLine || !prasLoaded) return;
    const line = lineOptions.find((o) => o.praId === pendingLine.praId && o.item.id === pendingLine.itemId) ?? null;
    setSelectedLine(line);
    if (!line) setDraftNotice("This draft's PRA line is no longer active. Pick another line in step 1.");
    setPendingLine(null);
  }, [pendingLine, prasLoaded, lineOptions]);

  const total = useMemo(() => {
    const n = (s: string) => Number(s) || 0;
    return n(text.subtotal) - n(text.sellerDiscount) - n(text.platformVoucher) + n(text.shipping) + n(text.insurance) + n(text.serviceFee);
  }, [text]);

  const errors = useMemo(
    () =>
      validate(text, {
        hasLine: !!selectedLine,
        mandatoryOutsideHq: !!selectedLine && mandatoryParts.has(selectedLine.item.partId) && !boughtAtHq,
        boughtAtHq,
        needsStore: picksStore && !supersedeTargetId && !storeId,
        needsReceipt: text.paymentMethod === 'PERSONAL_REIMBURSABLE' && photos.length === 0 && originalReceipts === 0,
      }),
    [text, selectedLine, mandatoryParts, boughtAtHq, picksStore, supersedeTargetId, storeId, photos, originalReceipts],
  );
  const errorsOnStep = (s: Step) => (Object.keys(errors) as ErrorKey[]).filter((k) => STEP_OF[k] === s);
  const stepStates: StepState[] = ([0, 1, 2] as Step[]).map((s) =>
    errorsOnStep(s).length === 0 ? 'complete' : attempted ? 'missing' : 'none',
  );
  const shownError = (k: ErrorKey) => (attempted ? errors[k] : undefined);
  const was = (k: TextKey) => (original ? original[k] : undefined);
  const reasonMissing = !!supersedeTargetId && !supersedeReason.trim();

  const resetForm = () => {
    setSelectedLine(null);
    setSupplierId(null);
    setBoughtAtHq(false);
    setStoreId(null);
    setText(EMPTY_TEXT);
    setPhotos([]);
    setOriginalReceipts(0);
    setAttempted(false);
    setSupersedeTargetId(null);
    setOriginal(null);
    setSupersedeReason('');
    setDraftId(null);
    setDraftNotice(null);
    setError(null);
    setStep(0);
  };

  const draftForm = (): RealisasiDraftForm => ({
    ...text,
    praId: selectedLine?.praId ?? null,
    praItemId: selectedLine?.item.id ?? null,
    partName: selectedLine?.item.partName ?? null,
    supplierId,
    boughtAtHq,
    storeId,
  });

  const handleSaveDraft = async () => {
    if (!user) return;
    try {
      const id = await saveDraft(user.id, draftId, draftForm(), step);
      setDraftId(id);
      setDraftNotice(
        `Saved on this phone at ${formatTime(new Date())}.${photos.length ? ' Photos aren’t kept in a draft: add them again when you create it.' : ''}`,
      );
      refreshDrafts();
    } catch {
      setDraftNotice('Could not save the draft on this phone.');
    }
  };

  const openDraft = (d: RealisasiDraft) => {
    const { praId, praItemId, supplierId: draftSupplier } = d.form;
    const restored = { ...EMPTY_TEXT };
    for (const k of Object.keys(EMPTY_TEXT) as TextKey[]) restored[k] = d.form[k] ?? '';
    setText(restored);
    setPhotos([]);
    setOriginalReceipts(0);
    setSelectedLine(null);
    setPendingLine(praId && praItemId ? { praId, itemId: praItemId } : null);
    setSupplierId(draftSupplier);
    setBoughtAtHq(!!d.form.boughtAtHq);
    setStoreId(d.form.storeId ?? null);
    setDraftId(d.id);
    setStep(d.step);
    setAttempted(false);
    setError(null);
    setDiscardArmed(null);
    setDraftNotice(null);
  };

  const handleDiscard = async (d: RealisasiDraft) => {
    if (!user) return;
    if (discardArmed !== d.id) return setDiscardArmed(d.id);
    await deleteDraft(user.id, d.id).catch(() => undefined);
    setDiscardArmed(null);
    refreshDrafts();
  };

  const handleSubmit = async () => {
    setError(null);
    setDraftNotice(null);
    setAttempted(true);
    const problemSteps = ([0, 1, 2] as Step[]).filter((s) => errorsOnStep(s).length > 0);
    if (problemSteps.length > 0) {
      setStep(problemSteps[0]);
      return;
    }
    if (reasonMissing) return;
    if (!selectedLine || !token) return setError('Not signed in.');
    if (boughtAtHq && !centre) return setError("HQ has no selling supplier set up yet, so a purchase at HQ can't be logged. Ask HQ.");
    const purchasedAtValue = toLocalDateTime(text.purchasedAt)!;

    const request: CreateRealisasiRequest = {
      ...(picksStore && storeId && !supersedeTargetId ? { tenantId: storeId } : {}),
      purchaseRequestAuthorizationId: selectedLine.praId,
      channel: text.channel.trim(),
      supplierId: boughtAtHq ? centre!.id : undefined,
      sellerName: boughtAtHq ? undefined : text.sellerName.trim(),
      paymentMethod: text.paymentMethod as PaymentMethod,
      paymentRef: text.paymentRef.trim() || undefined,
      purchasedAt: purchasedAtValue,
      subtotal: Number(text.subtotal) || 0,
      sellerDiscount: Number(text.sellerDiscount) || 0,
      platformVoucher: Number(text.platformVoucher) || 0,
      shipping: Number(text.shipping) || 0,
      insurance: Number(text.insurance) || 0,
      serviceFee: Number(text.serviceFee) || 0,
      ...(photos.length ? { receiptUploadIds: photos.map((p) => p.uploadId) } : {}),
      attachments: text.attachments.trim() || undefined,
      items: [
        {
          purchaseRequestAuthorizationItemId: selectedLine.item.id,
          partId: selectedLine.item.partId,
          purchasedQty: Number(text.purchasedQty),
          actualUnitPrice: Number(text.actualUnitPrice),
        },
      ],
    };

    setSubmitting(true);
    try {
      const response = supersedeTargetId
        ? await supersedeRealisasi(supersedeTargetId, { reason: supersedeReason.trim(), correction: request }, token)
        : await createRealisasi(request, token);
      if (draftId && user) {
        await deleteDraft(user.id, draftId).catch(() => undefined);
        setDraftId(null);
        refreshDrafts();
      }
      setPhotos([]);
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

  // A correction opens on step 1 with everything copied from the original;
  // each field then marks itself when it differs from what was recorded.
  const startSupersede = () => {
    if (!result) return;
    const firstItem = result.items[0];
    const copied: FormText = {
      channel: result.channel,
      sellerName: result.sellerName ?? '',
      paymentMethod: result.paymentMethod,
      paymentRef: result.paymentRef ?? '',
      purchasedAt: result.purchasedAt.slice(0, 10),
      attachments: result.attachments ?? '',
      subtotal: String(result.subtotal ?? ''),
      sellerDiscount: String(result.sellerDiscount ?? ''),
      platformVoucher: String(result.platformVoucher ?? ''),
      shipping: String(result.shipping ?? ''),
      insurance: String(result.insurance ?? ''),
      serviceFee: String(result.serviceFee ?? ''),
      purchasedQty: firstItem ? String(firstItem.purchasedQty) : '',
      actualUnitPrice: firstItem ? String(firstItem.actualUnitPrice ?? '') : '',
    };
    setSupersedeTargetId(result.id);
    setSupplierId(result.supplierId);
    setBoughtAtHq(!!centre && result.supplierId === centre.id);
    setText(copied);
    setOriginal(copied);
    setPhotos([]);
    setOriginalReceipts(result.receiptUploadIds?.length ?? 0);
    setSupersedeReason('');
    setAttempted(false);
    setDraftId(null);
    setDraftNotice(null);
    setResult(null);
    setStep(0);
  };

  const openReceipt = async (uploadId: string) => {
    if (!token) return;
    setActionError(null);
    try {
      const view = await viewUpload(uploadId, token);
      await Linking.openURL(view.getUrl);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Could not open the receipt.');
    }
  };

  const ownerPlus = isOwnerPlus(user);
  const mayLog = canLogPurchase(user);

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

          <Card>
            <KV k="Bought from" v={result.sellerName ?? result.supplierName ?? '—'} />
            <KV k="Paid" v={PAYMENT_LABEL[result.paymentMethod as PaymentMethod] ?? result.paymentMethod} />
            {result.externalOrderRef ? <KV k="Order ref" v={result.externalOrderRef} /> : null}
            {result.receiptUploadIds?.length ? (
              <View className="flex-row flex-wrap" style={{ gap: 12, marginTop: 6 }}>
                {result.receiptUploadIds.map((id, i) => (
                  <Text key={id} onPress={() => openReceipt(id)} accessibilityRole="button" style={{ ...textStyle(typeScale.helper), color: color.info }}>
                    {result.receiptUploadIds!.length === 1 ? 'View receipt' : `Receipt ${i + 1}`}
                  </Text>
                ))}
              </View>
            ) : null}
          </Card>

          {result.items.map((item) => (
            <Card key={item.id}>
              <Text style={{ ...textStyle(typeScale.body), color: color.ink }}>{item.partName}</Text>
              <View style={{ marginTop: 8, borderTopWidth: border.hair, borderTopColor: color.hair }}>
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
            <Callout>Paid with personal money: the store Owner pays it back and marks it in Reimbursements (PROC-08).</Callout>
          ) : null}

          {actionError ? <Callout tone="danger">{actionError}</Callout> : null}

          {result.status === 'PENDING_APPROVAL' || result.status === 'APPROVED' ? (
            <Field
              label="Reason (required to reject)"
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="e.g. over the limit without asking first"
            />
          ) : null}
          {result.status === 'PENDING_APPROVAL' || result.status === 'APPROVED' ? (
            <Row>
              {result.status === 'PENDING_APPROVAL' ? (
                <View style={{ flex: 1 }}>
                  <Button label="Approve" variant="gated" gate="OWNER+" disabled={!ownerPlus || busy} onPress={() => runAction(() => approveRealisasi(result.id, token!))} />
                </View>
              ) : null}
              <View style={{ flex: 1 }}>
                <Button
                  label="Reject"
                  variant="gated"
                  gate="OWNER+"
                  disabled={!ownerPlus || busy || !rejectReason.trim()}
                  onPress={() => runAction(() => rejectRealisasi(result.id, { reason: rejectReason.trim() }, token!))}
                />
              </View>
            </Row>
          ) : null}
          {result.status === 'PENDING_APPROVAL' || result.status === 'APPROVED' ? (
            <Button
              label="Supersede (correct this record)"
              variant="gated"
              gate="CREATOR·OWNER+"
              disabled={!(ownerPlus || result.createdById === user?.id)}
              onPress={startSupersede}
            />
          ) : null}
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

  const stepProblems = attempted ? errorsOnStep(step).length : 0;
  const showDrafts = !supersedeTargetId && !draftId && drafts.length > 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.surface }}>
      <ScrollView contentContainerClassName="gap-md px-xl pt-xl pb-xl">
        <Text style={{ ...textStyle(typeScale.screenTitle), color: color.ink }}>
          {supersedeTargetId ? 'Supersede Realisasi' : draftId ? 'New Realisasi · draft' : 'New Realisasi'}
        </Text>

        {showDrafts ? (
          <View className="gap-sm">
            <Section>{`Unfinished purchases · ${drafts.length}`}</Section>
            {drafts.map((d) => {
              const age = draftAgeDays(d);
              const saved = new Date(d.updatedAt);
              return (
                <Card key={d.id} tone={age >= STALE_DRAFT_DAYS ? 'warning' : undefined}>
                  <View className="flex-row items-center justify-between" style={{ gap: 8 }}>
                    <Text style={{ ...textStyle(typeScale.body), color: color.ink, flex: 1 }} numberOfLines={1}>
                      {d.form.partName ?? 'No PRA line picked yet'}
                    </Text>
                    {age >= STALE_DRAFT_DAYS ? <Chip label={`${age} days old`} tone="warning" /> : <Chip label="Draft" />}
                  </View>
                  <Text style={{ ...textStyle(typeScale.helper), color: color.steel, marginTop: 2 }}>
                    {`Saved ${formatDayLabel(saved)} ${formatTime(saved)} · step ${d.step + 1} of 3`}
                  </Text>
                  <View className="flex-row" style={{ gap: 8, marginTop: 9 }}>
                    <View style={{ flex: 1 }}>
                      <Button label="Continue" variant="secondary" onPress={() => openDraft(d)} style={{ paddingVertical: 8 }} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Button
                        label={discardArmed === d.id ? 'Confirm' : 'Discard'}
                        variant="secondary"
                        onPress={() => handleDiscard(d)}
                        style={{ paddingVertical: 8 }}
                      />
                    </View>
                  </View>
                  {discardArmed === d.id ? (
                    <Text style={{ ...textStyle(typeScale.helper), color: color.danger, marginTop: 6 }}>
                      Tap Confirm to delete this draft.
                    </Text>
                  ) : null}
                </Card>
              );
            })}
            <Text style={{ ...textStyle(typeScale.helper), color: color.mute }}>
              Drafts stay on this phone until you create or discard them. Or start a new purchase below.
            </Text>
          </View>
        ) : null}

        {supersedeTargetId ? (
          <Text style={{ ...textStyle(typeScale.helper), color: color.steel }}>
            Everything is copied from the original. Fields you change are marked in blue; the original stays visible,
            read-only.
          </Text>
        ) : null}

        <StepTabs steps={STEPS.map((label, i) => ({ label, state: stepStates[i] }))} active={step} onSelect={(i) => setStep(i as Step)} />

        {stepProblems > 0 ? (
          <Callout tone="danger">
            {`${stepProblems} ${stepProblems === 1 ? 'thing' : 'things'} to fix on this step before you can ${supersedeTargetId ? 'save the correction' : 'create'}.`}
          </Callout>
        ) : null}

        {step === 0 ? (
          <>
            {picksStore && !supersedeTargetId ? (
              <SelectField
                label="Bought for store"
                value={storeId}
                placeholder="Pick the store…"
                items={stores.map((t) => ({ id: t.id, label: t.name, sublabel: t.code }))}
                onChange={setStoreId}
              />
            ) : null}
            {shownError('store') ? <Text style={{ ...textStyle(typeScale.helper), color: color.danger }}>{shownError('store')}</Text> : null}

            <Section>PRA line</Section>
            {shownError('praLine') ? (
              <Text style={{ ...textStyle(typeScale.helper), color: color.danger }}>{shownError('praLine')}</Text>
            ) : null}
            {lineOptions.length === 0 ? (
              <Text style={{ ...textStyle(typeScale.body), color: color.mute }}>No active PRA lines found.</Text>
            ) : (
              lineOptions.map((opt) => (
                <Pressable
                  key={opt.item.id}
                  onPress={() => setSelectedLine(opt)}
                  style={{
                    borderWidth: border.base,
                    borderColor: selectedLine?.item.id === opt.item.id ? color.ink : shownError('praLine') ? color.danger : color.hair,
                    borderRadius: radius.sm,
                    padding: 10,
                    backgroundColor: color.panel,
                  }}
                >
                  <View className="flex-row items-center justify-between" style={{ gap: 8 }}>
                    <Text style={{ ...textStyle(typeScale.body), color: color.ink, flex: 1 }}>{opt.item.partName}</Text>
                    {mandatoryParts.has(opt.item.partId) ? <Chip label="From HQ only" tone="warning" /> : null}
                  </View>
                  <Text style={{ ...textStyle(typeScale.helper), color: color.steel }}>
                    {picksStore ? `${opt.tenantName} · ` : ''}PRA {opt.praId} · remaining {opt.item.remainingQty}
                  </Text>
                </Pressable>
              ))
            )}

            <Row>
              <Field label="Channel" value={text.channel} onChangeText={set('channel')} placeholder="Marketplace" error={shownError('channel')} changedFrom={was('channel')} />
            </Row>
            <Section>Bought from</Section>
            <View className="flex-row" style={{ gap: 0 }}>
              {([false, true] as const).map((atHq) => (
                <View key={String(atHq)} style={{ flex: 1 }}>
                  <Button
                    label={atHq ? 'At HQ' : 'Elsewhere'}
                    variant={boughtAtHq === atHq ? 'primary' : 'secondary'}
                    onPress={() => setBoughtAtHq(atHq)}
                  />
                </View>
              ))}
            </View>
            {boughtAtHq ? (
              <Text style={{ ...textStyle(typeScale.helper), color: color.steel }}>
                An urgent buy at {centre?.name ?? 'HQ'}, paid on the spot. Planned restocks from HQ go through “Order from HQ”.
              </Text>
            ) : (
              <Field
                label="Seller"
                value={text.sellerName}
                onChangeText={set('sellerName')}
                placeholder="e.g. Shopee · Toko Airsoft Jaya"
                error={shownError('sellerName')}
                changedFrom={was('sellerName')}
              />
            )}

            <View style={{ gap: 6 }}>
              <FieldLabel>Paid from</FieldLabel>
              <Row gap={0}>
                {(['COMPANY_ACCOUNT', 'PERSONAL_REIMBURSABLE'] as PaymentMethod[]).map((m) => (
                  <View key={m} style={{ flex: 1 }}>
                    <Button label={PAYMENT_LABEL[m]} variant={text.paymentMethod === m ? 'primary' : 'secondary'} onPress={() => set('paymentMethod')(m)} />
                  </View>
                ))}
              </Row>
              {shownError('paymentMethod') ? (
                <Text style={{ ...textStyle(typeScale.helper), color: color.danger }}>{shownError('paymentMethod')}</Text>
              ) : original && original.paymentMethod !== text.paymentMethod ? (
                <Text style={{ ...textStyle(typeScale.helper), color: color.info }}>
                  {`Was: ${PAYMENT_LABEL[original.paymentMethod as PaymentMethod] ?? original.paymentMethod}`}
                </Text>
              ) : text.paymentMethod === 'PERSONAL_REIMBURSABLE' ? (
                <Text style={{ ...textStyle(typeScale.helper), color: color.mute }}>The store’s Owner pays you back (PROC-08).</Text>
              ) : null}
            </View>
            <Row>
              <Field label="Payment ref" value={text.paymentRef} onChangeText={set('paymentRef')} mono placeholder="TRX-93921" changedFrom={was('paymentRef')} />
            </Row>
            {token ? (
              <PhotoPicker
                label="Receipt photos"
                purpose="PURCHASE_RECEIPT"
                token={token}
                photos={photos}
                onChange={setPhotos}
                sub={
                  originalReceipts > 0 && photos.length === 0
                    ? `The original's ${originalReceipts === 1 ? 'photo stays' : `${originalReceipts} photos stay`} with the correction; add one only if the receipt changed.`
                    : text.paymentMethod === 'PERSONAL_REIMBURSABLE'
                      ? 'Required when you paid yourself: it’s what the Owner pays you back against. Only the Owner, Accounting and you see it.'
                      : 'Optional when the store paid. Only the Owner, Accounting and you see it.'
                }
                error={shownError('receipt')}
              />
            ) : null}
            <Row>
              <Field
                label="Purchased at"
                value={text.purchasedAt}
                onChangeText={set('purchasedAt')}
                mono
                placeholder="YYYY-MM-DD"
                error={shownError('purchasedAt')}
                changedFrom={was('purchasedAt')}
              />
            </Row>
            <Field
              label="Link"
              value={text.attachments}
              onChangeText={set('attachments')}
              mono
              placeholder="https://…"
              sub="Optional: the order page, if there is one. The receipt itself goes in Receipt photos."
              changedFrom={was('attachments')}
            />
          </>
        ) : null}

        {step === 1 ? (
          <>
            <Section>Landed cost — six separate inputs</Section>
            <Row>
              <Field label="Subtotal" value={text.subtotal} onChangeText={set('subtotal')} mono keyboardType="numeric" error={shownError('subtotal')} changedFrom={was('subtotal')} />
              <Field
                label="− Seller discount"
                value={text.sellerDiscount}
                onChangeText={set('sellerDiscount')}
                mono
                keyboardType="numeric"
                error={shownError('sellerDiscount')}
                changedFrom={was('sellerDiscount')}
              />
            </Row>
            <Row>
              <Field
                label="− Platform voucher"
                value={text.platformVoucher}
                onChangeText={set('platformVoucher')}
                mono
                keyboardType="numeric"
                error={shownError('platformVoucher')}
                changedFrom={was('platformVoucher')}
              />
              <Field label="+ Shipping" value={text.shipping} onChangeText={set('shipping')} mono keyboardType="numeric" error={shownError('shipping')} changedFrom={was('shipping')} />
            </Row>
            <Row>
              <Field label="+ Insurance" value={text.insurance} onChangeText={set('insurance')} mono keyboardType="numeric" error={shownError('insurance')} changedFrom={was('insurance')} />
              <Field
                label="+ Service fee"
                value={text.serviceFee}
                onChangeText={set('serviceFee')}
                mono
                keyboardType="numeric"
                error={shownError('serviceFee')}
                changedFrom={was('serviceFee')}
              />
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
                    <Field
                      label="Qty (purchase UOM)"
                      value={text.purchasedQty}
                      onChangeText={set('purchasedQty')}
                      mono
                      keyboardType="numeric"
                      error={shownError('purchasedQty')}
                      changedFrom={was('purchasedQty')}
                    />
                    <Field
                      label="Unit price"
                      value={text.actualUnitPrice}
                      onChangeText={set('actualUnitPrice')}
                      mono
                      keyboardType="numeric"
                      error={shownError('actualUnitPrice')}
                      changedFrom={was('actualUnitPrice')}
                    />
                  </Row>
                </View>
              </Card>
            ) : (
              <Card>
                <Text style={{ ...textStyle(typeScale.body), color: color.ink }}>Pick a PRA line in step 1 first.</Text>
                <Text style={{ ...textStyle(typeScale.helper), color: color.steel, marginTop: 2 }}>
                  The part and its purchase unit come from that line, so there's nothing to fill in here yet.
                </Text>
                <View style={{ marginTop: 9 }}>
                  <Button label="Go to step 1" variant="secondary" onPress={() => setStep(0)} />
                </View>
              </Card>
            )}

            <Callout tone="warning">
              Only escalated purchases go to PENDING_APPROVAL. A purchase inside the ceiling auto-approves the moment
              it's created.
            </Callout>
          </>
        ) : null}

        {supersedeTargetId ? (
          <Field
            label="Reason for correction"
            value={supersedeReason}
            onChangeText={setSupersedeReason}
            placeholder="e.g. wrong shipping cost entered"
            error={attempted && reasonMissing ? 'Required — the correction is refused without a reason.' : undefined}
          />
        ) : null}

        {error ? <Text style={{ ...textStyle(typeScale.helper), color: color.danger }}>{error}</Text> : null}
        {draftNotice ? <Text style={{ ...textStyle(typeScale.helper), color: color.steel }}>{draftNotice}</Text> : null}

        {supersedeTargetId ? (
          <Button label={submitting ? 'Saving…' : 'Save correction'} onPress={handleSubmit} disabled={submitting} />
        ) : (
          <>
            <Button
              label={submitting ? 'Saving…' : 'Create'}
              variant="gated"
              gate="MANAGER+·PROC"
              onPress={handleSubmit}
              disabled={submitting || !mayLog}
            />
            <Button label="Save draft" variant="secondary" onPress={handleSaveDraft} disabled={submitting} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
