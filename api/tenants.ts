import { apiRequest } from './client';
import type { TenantResponse } from './types';

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
