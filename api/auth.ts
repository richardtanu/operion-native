import { apiRequest } from './client';
import type { LoginRequest, LoginResponse } from './types';

/**
 * Endpoint path is a placeholder — no OpenAPI spec exists to confirm the
 * real auth route against the separate backend project. Update once known.
 */
export function login(request: LoginRequest): Promise<LoginResponse> {
  return apiRequest<LoginResponse>('/auth/login', { method: 'POST', body: request });
}
