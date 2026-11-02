import { apiRequest } from './client';
import type { StoreSettingsRequest, StoreSettingsResponse, TenantResponse } from './types';

/** BE-14: the caller's own tenant first, then every descendant — the store picker's list. Any signed-in user. */
export function getTenantTree(token: string): Promise<TenantResponse[]> {
  return apiRequest<TenantResponse[]>('/tenants/tree', { token });
}

/**
 * BE-16: only OWNER+ signed in at that very store (HQ can read, not set).
 * `null` clears the budget. A budget warns, it never blocks.
 */
export function setPurchaseBudget(tenantId: string, amount: number | null, token: string): Promise<TenantResponse> {
  return apiRequest<TenantResponse>(`/tenants/${tenantId}/purchase-budget`, { method: 'PATCH', body: { amount }, token });
}

/** BE-38: anyone at the store or above it; a store that never saved any reads the defaults. */
export function getStoreSettings(tenantId: string, token: string): Promise<StoreSettingsResponse> {
  return apiRequest<StoreSettingsResponse>(`/tenants/${tenantId}/settings`, { token });
}

/** BE-38: the store's own OWNER+, signed in at that store; HQ can read, not set. */
export function updateStoreSettings(tenantId: string, request: StoreSettingsRequest, token: string): Promise<StoreSettingsResponse> {
  return apiRequest<StoreSettingsResponse>(`/tenants/${tenantId}/settings`, { method: 'PATCH', body: request, token });
}
