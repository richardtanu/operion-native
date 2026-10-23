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
 * Module 2 — Inventory (INV-01…08). Reads walk the caller's tenant tree, so
 * an HQ caller gets every store's rows with no store on them until BE-26;
 * the store screens are the ones built on this today.
 */

/** INV-08 tiles. For an HQ caller it sums every store, which is why HQ doesn't show it. */
export function getInventoryDashboard(token: string): Promise<InventoryDashboardResponse> {
  return apiRequest<InventoryDashboardResponse>('/inventory/dashboard', { token });
}

/** Every item with its below-minimum status. */
export function getStockSummary(token: string): Promise<StockSummaryRow[]> {
  return apiRequest<StockSummaryRow[]>('/inventory/stock-summary', { token });
}

/** Usage per item: days of cover, target days and a suggested amount. */
export function getBurnRates(token: string): Promise<BurnRateResponse[]> {
  return apiRequest<BurnRateResponse[]>('/burn-rate', { token });
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
