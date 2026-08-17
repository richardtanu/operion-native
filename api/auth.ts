import { apiRequest } from './client';
import type { AuthResponse, LoginRequest, RegisterRequest, UserProfileResponse } from './types';

export function login(request: LoginRequest): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/auth/login', { method: 'POST', body: request });
}

export function register(request: RegisterRequest): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/auth/register', { method: 'POST', body: request });
}

/** Login/register return only a token — this is the actual source of user profile data. */
export function getMe(token: string): Promise<UserProfileResponse> {
  return apiRequest<UserProfileResponse>('/auth/me', { token });
}
