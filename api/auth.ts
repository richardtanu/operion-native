import { apiRequest } from './client';
import type { AuthResponse, LoginRequest, RegisterRequest, UserProfileResponse } from './types';

export function login(request: LoginRequest): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/auth/login', { method: 'POST', body: request });
}

/** ADMIN bearer token required since BE-12 — unused in the app (no registration UI). */
export function register(request: RegisterRequest, adminToken: string): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/auth/register', { method: 'POST', body: request, token: adminToken });
}

/** Login/register return only a token — this is the actual source of user profile data. */
export function getMe(token: string): Promise<UserProfileResponse> {
  return apiRequest<UserProfileResponse>('/auth/me', { token });
}
