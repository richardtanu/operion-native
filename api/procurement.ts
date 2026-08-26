import { apiRequest } from './client';
import type {
  CreateGoodsReceiptRequest,
  CreatePurchaseOrderRequest,
  CreatePurchaseRequestAuthorizationRequest,
  CreatePurchaseRequestRequest,
  CreateRealisasiRequest,
  CreateSupplierRequest,
  GoodsReceiptResponse,
  PurchaseOrderResponse,
  PurchaseRequestAuthorizationResponse,
  PurchaseRequestResponse,
  RealisasiResponse,
  RejectRequest,
  StatusHistoryEntry,
  SupplierResponse,
} from './types';

/**
 * Module 1 (Procurement) — PROC-01…08. Blocking-error, manual-retry: every
 * function here calls api/client.ts directly, never through the outbox
 * (the same pattern as AuthContext.login()). Procurement financial/approval
 * actions must not be queued — a queued PR approval or Realisasi creation
 * that fails silently later is worse than a refusal now.
 */

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

export function cancelPurchaseRequest(id: string, token: string): Promise<PurchaseRequestResponse> {
  return apiRequest<PurchaseRequestResponse>(`/purchase-requests/${id}/cancel`, { method: 'PATCH', token });
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

export function listRealisasi(token: string): Promise<RealisasiResponse[]> {
  return apiRequest<RealisasiResponse[]>('/realisasi', { token });
}

export function getRealisasi(id: string, token: string): Promise<RealisasiResponse> {
  return apiRequest<RealisasiResponse>(`/realisasi/${id}`, { token });
}

/** Escalated (over-ceiling) only — Owner+. Below-ceiling Realisasi auto-passes to APPROVED at creation, no action needed. */
export function approveRealisasi(id: string, token: string): Promise<RealisasiResponse> {
  return apiRequest<RealisasiResponse>(`/realisasi/${id}/approve`, { method: 'PATCH', token });
}

export function rejectRealisasi(id: string, token: string): Promise<RealisasiResponse> {
  return apiRequest<RealisasiResponse>(`/realisasi/${id}/reject`, { method: 'PATCH', token });
}

/** Correction, not edit — flips the original to SUPERSEDED and creates a new record linked by supersedesId. */
export function supersedeRealisasi(id: string, request: CreateRealisasiRequest, token: string): Promise<RealisasiResponse> {
  return apiRequest<RealisasiResponse>(`/realisasi/${id}/supersede`, { method: 'POST', body: request, token });
}

export function getRealisasiHistory(id: string, token: string): Promise<StatusHistoryEntry[]> {
  return apiRequest<StatusHistoryEntry[]>(`/realisasi/${id}/history`, { token });
}

// ---------- PROC-05 — Goods Receipt ----------

export function createGoodsReceipt(request: CreateGoodsReceiptRequest, token: string): Promise<GoodsReceiptResponse> {
  return apiRequest<GoodsReceiptResponse>('/goods-receipts', { method: 'POST', body: request, token });
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

export function cancelPurchaseOrder(id: string, token: string): Promise<PurchaseOrderResponse> {
  return apiRequest<PurchaseOrderResponse>(`/purchase-orders/${id}/cancel`, { method: 'PATCH', token });
}

export function getPurchaseOrderHistory(id: string, token: string): Promise<StatusHistoryEntry[]> {
  return apiRequest<StatusHistoryEntry[]>(`/purchase-orders/${id}/history`, { token });
}

// ---------- PROC-08 — Reimbursement Queue ----------
// No dedicated endpoint or DTO — reuses GET /realisasi (listRealisasi above),
// client-filtered to paymentMethod=PERSONAL_REIMBURSABLE &&
// reimbursementStatus=PENDING. No markReimbursed function exists here on
// purpose: the backend has no endpoint for it (orphan action, don't add).
