import { apiRequest, queryString } from './client';
import type {
  CreatePartRequest,
  PartCategoryResponse,
  PartResponse,
  PartTypeResponse,
  SavePartCategoryRequest,
  SavePartTypeRequest,
  StockMovementResponse,
  UpdateHqFlagsRequest,
  UpdatePartRequest,
} from './types';

/**
 * Part module (c:\demo, module/part) — the items a store stocks. Every
 * Procurement create screen needs it for a real Part picker, and module 2's
 * Items screen (INV-06) manages it. GET /parts returns everything in the
 * caller's tree (including retired parts; callers filter them out), each
 * with its store since BE-26; `tenantId` narrows to one store.
 */
export function listParts(token: string, tenantId?: string): Promise<PartResponse[]> {
  return apiRequest<PartResponse[]>(`/parts${queryString({ tenantId })}`, { token });
}

/** BE-26: one item's stock changes, newest first, each with who made it. `limit` defaults to 50, max 500. */
export function listPartMovements(id: string, token: string, limit?: number): Promise<StockMovementResponse[]> {
  return apiRequest<StockMovementResponse[]>(`/parts/${id}/movements${queryString({ limit })}`, { token });
}

/** HQ admins only (403 for a store). Selling needs a price (BE-28, 400 without). */
export function updateHqFlags(id: string, request: UpdateHqFlagsRequest, token: string): Promise<PartResponse> {
  return apiRequest<PartResponse>(`/parts/${id}/hq-flags`, { method: 'PATCH', body: request, token });
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

/**
 * BE-29: one list, HQ's, read by every store through the same endpoints.
 * Reads are open to anyone signed in; changes are HQ admins only (ADMIN role
 * or PRINCIPAL, signed in at HQ), and a store's own Admin gets 403.
 */
export function listCategories(token: string): Promise<PartCategoryResponse[]> {
  return apiRequest<PartCategoryResponse[]>('/part-categories', { token });
}

export function listPartTypes(categoryId: string, token: string): Promise<PartTypeResponse[]> {
  return apiRequest<PartTypeResponse[]>(`/part-types/category/${categoryId}`, { token });
}

export function listAllPartTypes(token: string): Promise<PartTypeResponse[]> {
  return apiRequest<PartTypeResponse[]>('/part-types', { token });
}

/** Names are unique on the list (400 "Category already exists"). */
export function createCategory(request: SavePartCategoryRequest, token: string): Promise<PartCategoryResponse> {
  return apiRequest<PartCategoryResponse>('/part-categories', { method: 'POST', body: request, token });
}

export function updateCategory(id: string, request: SavePartCategoryRequest, token: string): Promise<PartCategoryResponse> {
  return apiRequest<PartCategoryResponse>(`/part-categories/${id}`, { method: 'PUT', body: request, token });
}

/** 400 while it still has types or any store's item uses it. */
export function deleteCategory(id: string, token: string): Promise<void> {
  return apiRequest<void>(`/part-categories/${id}`, { method: 'DELETE', token });
}

export function createPartType(request: SavePartTypeRequest, token: string): Promise<PartTypeResponse> {
  return apiRequest<PartTypeResponse>('/part-types', { method: 'POST', body: request, token });
}

export function updatePartType(id: string, request: SavePartTypeRequest, token: string): Promise<PartTypeResponse> {
  return apiRequest<PartTypeResponse>(`/part-types/${id}`, { method: 'PUT', body: request, token });
}

/** 400 while any item uses it. */
export function deletePartType(id: string, token: string): Promise<void> {
  return apiRequest<void>(`/part-types/${id}`, { method: 'DELETE', token });
}
