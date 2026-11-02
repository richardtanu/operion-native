import { apiRequest, queryString } from './client';
import type { AuthResponse, RegisterRequest, Role, Scope, UpdateUserActiveRequest, UserFilters, UserProfileResponse } from './types';

/**
 * People (BE-31…BE-36). Everything here is an ADMIN's (inside their tree,
 * never someone above them) or, since BE-34, a store Owner's (their own
 * store's people below Owner, never an Admin). Nobody changes themself here:
 * your own password is PATCH /auth/password.
 */

/** The Admin's tree, or one store in it; the Owner's own store. */
export function listUsers(token: string, filters: UserFilters = {}): Promise<UserProfileResponse[]> {
  return apiRequest<UserProfileResponse[]>(`/users${queryString(filters)}`, { token });
}

/**
 * Adds a person as OPERATOR with no scope; they change the password at their
 * first sign-in. The token that comes back is theirs, so callers ignore it.
 */
export function registerUser(request: RegisterRequest, token: string): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/auth/register', { method: 'POST', body: request, token });
}

/** BE-31: an Admin grants up to their own scope; an Owner gives Supervisor or Manager (BE-34). */
export function updateUserScope(id: string, scope: Scope, token: string): Promise<UserProfileResponse> {
  return apiRequest<UserProfileResponse>(`/users/${id}/scope`, { method: 'PATCH', body: { scope }, token });
}

/** An Admin gives any role; an Owner any but ADMIN (BE-34). */
export function updateUserRole(id: string, role: Role, token: string): Promise<UserProfileResponse> {
  return apiRequest<UserProfileResponse>(`/users/${id}/role`, { method: 'PATCH', body: { role }, token });
}

/** BE-33: switching off needs a reason and takes effect at once; switching on clears it. */
export function setUserActive(id: string, request: UpdateUserActiveRequest, token: string): Promise<UserProfileResponse> {
  return apiRequest<UserProfileResponse>(`/users/${id}/active`, { method: 'PATCH', body: request, token });
}

/** BE-36: a temporary password, 8 to 72 characters; they must change it at their next sign-in. */
export function resetUserPassword(id: string, newPassword: string, token: string): Promise<UserProfileResponse> {
  return apiRequest<UserProfileResponse>(`/users/${id}/password`, { method: 'PATCH', body: { newPassword }, token });
}
