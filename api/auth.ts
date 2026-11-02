import { apiRequest } from './client';
import type { AuthResponse, ChangePasswordRequest, LoginRequest, UserProfileResponse } from './types';

export function login(request: LoginRequest): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/auth/login', { method: 'POST', body: request });
}

/**
 * BE-32: your own password, proving the current one first. A wrong current
 * password is 400, so the app stays signed in. Every older sign-in ends
 * (BE-36), this one included: keep the token that comes back.
 */
export function changePassword(request: ChangePasswordRequest, token: string): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/auth/password', { method: 'PATCH', body: request, token });
}

/** Login/register return only a token — this is the actual source of user profile data. */
export function getMe(token: string): Promise<UserProfileResponse> {
  return apiRequest<UserProfileResponse>('/auth/me', { token });
}
