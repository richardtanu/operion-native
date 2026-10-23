import { apiRequest } from './client';
import type { CreatePartRequest, PartCategoryResponse, PartResponse, PartTypeResponse, UpdatePartRequest } from './types';

/**
 * Part module (c:\demo, module/part) — the items a store stocks. Every
 * Procurement create screen needs it for a real Part picker, and module 2's
 * Items screen (INV-06) manages it. GET /parts returns everything
 * (including retired parts); callers filter retired ones out.
 */
export function listParts(token: string): Promise<PartResponse[]> {
  return apiRequest<PartResponse[]>('/parts', { token });
}

/** BE-25: the store's MANAGER+ or ADMIN (403 otherwise). */
export function createPart(request: CreatePartRequest, token: string): Promise<PartResponse> {
  return apiRequest<PartResponse>('/parts', { method: 'POST', body: request, token });
}

/** BE-25: same rule as create. Only the caller's own store's items. */
export function updatePart(id: string, request: UpdatePartRequest, token: string): Promise<PartResponse> {
  return apiRequest<PartResponse>(`/parts/${id}`, { method: 'PUT', body: request, token });
}

/** BE-25: OWNER+ or ADMIN. Refused while stock > 0 or the item is installed. */
export function retirePart(id: string, reason: string, token: string): Promise<PartResponse> {
  return apiRequest<PartResponse>(`/parts/${id}/retire`, { method: 'PATCH', body: { reason }, token });
}

export function restorePart(id: string, token: string): Promise<PartResponse> {
  return apiRequest<PartResponse>(`/parts/${id}/restore`, { method: 'PATCH', token });
}

/**
 * BE-25: say which HQ catalog item a store item is. The store's MANAGER+ may
 * only create a link on an unlinked item, to an item HQ sells; changing or
 * removing one (a different id, or null) is HQ's (403). Items counted
 * differently can't be linked (400).
 */
export function linkToCatalog(id: string, catalogPartId: string | null, token: string): Promise<PartResponse> {
  return apiRequest<PartResponse>(`/parts/${id}/catalog-link`, { method: 'PATCH', body: { catalogPartId }, token });
}

/** Reads are open to anyone; changes are ADMIN only (BE-25), HQ admins only after BE-29. */
export function listCategories(token: string): Promise<PartCategoryResponse[]> {
  return apiRequest<PartCategoryResponse[]>('/part-categories', { token });
}

export function listPartTypes(categoryId: string, token: string): Promise<PartTypeResponse[]> {
  return apiRequest<PartTypeResponse[]>(`/part-types/category/${categoryId}`, { token });
}
