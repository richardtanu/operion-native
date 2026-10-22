import { apiRequest } from './client';
import type {
  CancelPurchaseOrderRequest,
  CatalogItemResponse,
  CreateGoodsReceiptRequest,
  CreatePurchaseOrderRequest,
  CreatePurchaseRequestAuthorizationRequest,
  CreatePurchaseRequestRequest,
  CreateRealisasiRequest,
  CreateSupplierRequest,
  GoodsReceiptFilters,
  GoodsReceiptResponse,
  MarkReimbursedRequest,
  ProcurementActivityEntry,
  ProcurementActivityFilters,
  PurchaseOrderResponse,
  PurchaseRequestAuthorizationResponse,
  PurchaseRequestResponse,
  RealisasiFilters,
  RealisasiResponse,
  RejectRequest,
  StatusHistoryEntry,
  StoreSpendingResponse,
  SupersedeRealisasiRequest,
  SupplierResponse,
} from './types';

/**
 * Module 1 (Procurement) — PROC-01…08. Blocking-error, manual-retry: every
 * function here calls api/client.ts directly, never through the outbox
 * (the same pattern as AuthContext.login()). Procurement financial/approval
 * actions must not be queued — a queued PR approval or Realisasi creation
 * that fails silently later is worse than a refusal now.
 */

function queryString(params: object): string {
  const pairs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return pairs.length ? `?${pairs.join('&')}` : '';
}

// ---------- PROC-01/02 — Purchase Request ----------

export function createPurchaseRequest(request: CreatePurchaseRequestRequest, token: string): Promise<PurchaseRequestResponse> {
  return apiRequest<PurchaseRequestResponse>('/purchase-requests', { method: 'POST', body: request, token });
}

export function listPurchaseRequests(token: string): Promise<PurchaseRequestResponse[]> {
  return apiRequest<PurchaseRequestResponse[]>('/purchase-requests', { token });
}

export function getPurchaseRequestHistory(id: string, token: string): Promise<StatusHistoryEntry[]> {
  return apiRequest<StatusHistoryEntry[]>(`/purchase-requests/${id}/history`, { token });
}

export function approvePurchaseRequest(id: string, token: string): Promise<PurchaseRequestResponse> {
  return apiRequest<PurchaseRequestResponse>(`/purchase-requests/${id}/approve`, { method: 'PATCH', token });
}

export function rejectPurchaseRequest(id: string, request: RejectRequest, token: string): Promise<PurchaseRequestResponse> {
  return apiRequest<PurchaseRequestResponse>(`/purchase-requests/${id}/reject`, { method: 'PATCH', body: request, token });
}

/** BE-15: PENDING → the requester or the store's OWNER+; APPROVED → OWNER+ only. Reason required. */
export function cancelPurchaseRequest(id: string, request: RejectRequest, token: string): Promise<PurchaseRequestResponse> {
  return apiRequest<PurchaseRequestResponse>(`/purchase-requests/${id}/cancel`, { method: 'PATCH', body: request, token });
}

// ---------- PROC-03 — Purchase Request Authorization (PRA) ----------

export function createPurchaseAuthorization(
  request: CreatePurchaseRequestAuthorizationRequest,
  token: string,
): Promise<PurchaseRequestAuthorizationResponse> {
  return apiRequest<PurchaseRequestAuthorizationResponse>('/purchase-authorizations', { method: 'POST', body: request, token });
}

export function listPurchaseAuthorizations(token: string): Promise<PurchaseRequestAuthorizationResponse[]> {
  return apiRequest<PurchaseRequestAuthorizationResponse[]>('/purchase-authorizations', { token });
}

export function getPurchaseAuthorization(id: string, token: string): Promise<PurchaseRequestAuthorizationResponse> {
  return apiRequest<PurchaseRequestAuthorizationResponse>(`/purchase-authorizations/${id}`, { token });
}

export function cancelPurchaseAuthorization(id: string, token: string): Promise<PurchaseRequestAuthorizationResponse> {
  return apiRequest<PurchaseRequestAuthorizationResponse>(`/purchase-authorizations/${id}/cancel`, { method: 'PATCH', token });
}

export function getPurchaseAuthorizationHistory(id: string, token: string): Promise<StatusHistoryEntry[]> {
  return apiRequest<StatusHistoryEntry[]>(`/purchase-authorizations/${id}/history`, { token });
}

// ---------- PROC-04 — Realisasi ----------

export function createRealisasi(request: CreateRealisasiRequest, token: string): Promise<RealisasiResponse> {
  return apiRequest<RealisasiResponse>('/realisasi', { method: 'POST', body: request, token });
}

/** BE-18: `paymentMethod` / `reimbursementStatus` are filtered on the server. */
export function listRealisasi(token: string, filters: RealisasiFilters = {}): Promise<RealisasiResponse[]> {
  return apiRequest<RealisasiResponse[]>(`/realisasi${queryString(filters)}`, { token });
}

export function getRealisasi(id: string, token: string): Promise<RealisasiResponse> {
  return apiRequest<RealisasiResponse>(`/realisasi/${id}`, { token });
}

/** Escalated (over-ceiling) only — Owner+. Below-ceiling Realisasi auto-passes to APPROVED at creation, no action needed. */
export function approveRealisasi(id: string, token: string): Promise<RealisasiResponse> {
  return apiRequest<RealisasiResponse>(`/realisasi/${id}/approve`, { method: 'PATCH', token });
}

/** BE-17: OWNER+, from PENDING_APPROVAL or APPROVED. Reason required (it always was — `RejectRealisasiRequest`). */
export function rejectRealisasi(id: string, request: RejectRequest, token: string): Promise<RealisasiResponse> {
  return apiRequest<RealisasiResponse>(`/realisasi/${id}/reject`, { method: 'PATCH', body: request, token });
}

/** BE-18: the store's own OWNER+ marks one or several personal purchases paid back. All-or-nothing. */
export function markReimbursed(request: MarkReimbursedRequest, token: string): Promise<RealisasiResponse[]> {
  return apiRequest<RealisasiResponse[]>('/realisasi/reimbursements/mark-paid', { method: 'PATCH', body: request, token });
}

/** BE-18: REIMBURSED → PENDING, with a reason. Same rule as mark-paid. */
export function undoReimbursement(id: string, request: RejectRequest, token: string): Promise<RealisasiResponse> {
  return apiRequest<RealisasiResponse>(`/realisasi/${id}/reimbursement/undo`, { method: 'PATCH', body: request, token });
}

/** Correction, not edit — flips the original to SUPERSEDED and creates a new record linked by supersedesId. */
export function supersedeRealisasi(id: string, request: SupersedeRealisasiRequest, token: string): Promise<RealisasiResponse> {
  return apiRequest<RealisasiResponse>(`/realisasi/${id}/supersede`, { method: 'POST', body: request, token });
}

export function getRealisasiHistory(id: string, token: string): Promise<StatusHistoryEntry[]> {
  return apiRequest<StatusHistoryEntry[]>(`/realisasi/${id}/history`, { token });
}

// ---------- PROC-05 — Goods Receipt ----------

export function createGoodsReceipt(request: CreateGoodsReceiptRequest, token: string): Promise<GoodsReceiptResponse> {
  return apiRequest<GoodsReceiptResponse>('/goods-receipts', { method: 'POST', body: request, token });
}

/** BE-08: the caller's tenant tree, newest `receivedDate` first. Absent filters are simply not sent. */
export function listGoodsReceipts(filters: GoodsReceiptFilters, token: string): Promise<GoodsReceiptResponse[]> {
  return apiRequest<GoodsReceiptResponse[]>(`/goods-receipts${queryString(filters)}`, { token });
}

/** An id outside the caller's tree answers exactly like a missing one. */
export function getGoodsReceipt(id: string, token: string): Promise<GoodsReceiptResponse> {
  return apiRequest<GoodsReceiptResponse>(`/goods-receipts/${id}`, { token });
}

export function listGoodsReceiptsByPurchaseOrder(poId: string, token: string): Promise<GoodsReceiptResponse[]> {
  return apiRequest<GoodsReceiptResponse[]>(`/goods-receipts/purchase-order/${poId}`, { token });
}

export function listGoodsReceiptsByRealisasi(realisasiId: string, token: string): Promise<GoodsReceiptResponse[]> {
  return apiRequest<GoodsReceiptResponse[]>(`/goods-receipts/realisasi/${realisasiId}`, { token });
}

// ---------- PROC-06 — Supplier ----------

export function createSupplier(request: CreateSupplierRequest, token: string): Promise<SupplierResponse> {
  return apiRequest<SupplierResponse>('/suppliers', { method: 'POST', body: request, token });
}

export function listSuppliers(token: string): Promise<SupplierResponse[]> {
  return apiRequest<SupplierResponse[]>('/suppliers', { token });
}

// ---------- PROC-07 — Purchase Order ----------

export function createPurchaseOrder(request: CreatePurchaseOrderRequest, token: string): Promise<PurchaseOrderResponse> {
  return apiRequest<PurchaseOrderResponse>('/purchase-orders', { method: 'POST', body: request, token });
}

export function listPurchaseOrders(token: string): Promise<PurchaseOrderResponse[]> {
  return apiRequest<PurchaseOrderResponse[]>('/purchase-orders', { token });
}

export function getPurchaseOrder(id: string, token: string): Promise<PurchaseOrderResponse> {
  return apiRequest<PurchaseOrderResponse>(`/purchase-orders/${id}`, { token });
}

export function sendPurchaseOrder(id: string, token: string): Promise<PurchaseOrderResponse> {
  return apiRequest<PurchaseOrderResponse>(`/purchase-orders/${id}/send`, { method: 'PATCH', token });
}

/** BE-20: DRAFT → creator or OWNER+; ORDERED / PARTIALLY_RECEIVED → OWNER+ with a reason. */
export function cancelPurchaseOrder(id: string, request: CancelPurchaseOrderRequest, token: string): Promise<PurchaseOrderResponse> {
  return apiRequest<PurchaseOrderResponse>(`/purchase-orders/${id}/cancel`, { method: 'PATCH', body: request, token });
}

// ---------- HQ catalog (BE-21) ----------

/** What HQ sells, with the caller's own store's linked copy. Any signed-in user. */
export function getCatalog(token: string): Promise<CatalogItemResponse[]> {
  return apiRequest<CatalogItemResponse[]>('/catalog', { token });
}

// ---------- Spending (BE-16) ----------

/** OWNER+ only (403 below). `month` is `yyyy-MM`. Omit `tenantId` for every store in the caller's tree. */
export function getSpending(month: string, token: string, tenantId?: string): Promise<StoreSpendingResponse[]> {
  return apiRequest<StoreSpendingResponse[]>(`/procurement/spending${queryString({ month, tenantId })}`, { token });
}

export function getPurchaseOrderHistory(id: string, token: string): Promise<StatusHistoryEntry[]> {
  return apiRequest<StatusHistoryEntry[]>(`/purchase-orders/${id}/history`, { token });
}

// ---------- PROC-08 — Reimbursement Queue ----------
// GET /realisasi with paymentMethod=PERSONAL_REIMBURSABLE and a
// reimbursementStatus filter (server-side since BE-18), plus markReimbursed /
// undoReimbursement above.

// ---------- Activity log (BE-07) ----------

/** Newest first, across the caller's tenant tree. 403 unless ADMIN or PROCUREMENT role, or OWNER+ scope. */
export function getProcurementActivity(filters: ProcurementActivityFilters, token: string): Promise<ProcurementActivityEntry[]> {
  return apiRequest<ProcurementActivityEntry[]>(`/procurement/activity${queryString(filters)}`, { token });
}
