import { apiRequest, queryString } from './client';
import type {
  BurnRateResponse,
  CreateStockAdjustmentRequest,
  InventoryDashboardResponse,
  RejectRequest,
  StockAdjustmentResponse,
  StockSummaryRow,
} from './types';

/**
 * Module 2 — Inventory (INV-01…09). Reads walk the caller's tenant tree;
 * since BE-26 every row says which store it belongs to, and the lists take
 * `tenantId` to narrow to one store (outside the caller's tree → 400).
 */

/** INV-08 tiles. No store filter: for an HQ caller it sums every store, which is why HQ doesn't show it. */
export function getInventoryDashboard(token: string): Promise<InventoryDashboardResponse> {
  return apiRequest<InventoryDashboardResponse>('/inventory/dashboard', { token });
}

/** Every item with its status and, since BE-27, why it's low (`lowBecause`) and its days of cover. */
export function getStockSummary(token: string, tenantId?: string): Promise<StockSummaryRow[]> {
  return apiRequest<StockSummaryRow[]>(`/inventory/stock-summary${queryString({ tenantId })}`, { token });
}

/** Usage per item, with each store's own settings (BE-26): days of cover, target days, a suggested amount. */
export function getBurnRates(token: string, tenantId?: string): Promise<BurnRateResponse[]> {
  return apiRequest<BurnRateResponse[]>(`/burn-rate${queryString({ tenantId })}`, { token });
}

export function getBurnRate(partId: string, token: string): Promise<BurnRateResponse> {
  return apiRequest<BurnRateResponse>(`/burn-rate/${partId}`, { token });
}

// ---------- INV-04 — Stock adjustments (BE-25) ----------

/** The store's MANAGER+ (403 below). The store's Owners are told; stock changes only on approval. */
export function requestStockAdjustment(request: CreateStockAdjustmentRequest, token: string): Promise<StockAdjustmentResponse> {
  return apiRequest<StockAdjustmentResponse>('/stock-adjustments', { method: 'POST', body: request, token });
}

/** Every adjustment in the caller's tree; `selfApproved: true` narrows to those. */
export function listStockAdjustments(token: string, selfApproved?: boolean): Promise<StockAdjustmentResponse[]> {
  return apiRequest<StockAdjustmentResponse[]>(`/stock-adjustments${queryString({ selfApproved })}`, { token });
}

export function listPendingStockAdjustments(token: string): Promise<StockAdjustmentResponse[]> {
  return apiRequest<StockAdjustmentResponse[]>('/stock-adjustments/pending', { token });
}

/** The store's own OWNER+. Never queued: an approval changes stock and must succeed or fail now. */
export function approveStockAdjustment(id: string, token: string): Promise<StockAdjustmentResponse> {
  return apiRequest<StockAdjustmentResponse>(`/stock-adjustments/${id}/approve`, { method: 'PATCH', token });
}

/** Same rule as approve; rejecting your own request just withdraws it. */
export function rejectStockAdjustment(id: string, request: RejectRequest, token: string): Promise<StockAdjustmentResponse> {
  return apiRequest<StockAdjustmentResponse>(`/stock-adjustments/${id}/reject`, { method: 'PATCH', body: request, token });
}
