import { apiRequest } from './client';
import type { PartResponse } from './types';

/**
 * Part module (c:\demo, module/part) — not Procurement's own, but every
 * Procurement create screen needs it to populate a real Part picker instead
 * of a free-text partId field. GET /parts exists and returns everything
 * (including retired parts); callers filter retired ones out.
 */
export function listParts(token: string): Promise<PartResponse[]> {
  return apiRequest<PartResponse[]>('/parts', { token });
}
