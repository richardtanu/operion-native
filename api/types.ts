/**
 * Hand-written from the real backend source (c:\demo\src\main\java\com\example\operion\module\auth),
 * not guessed — checked against AuthController.java, LoginRequest.java, RegisterRequest.java,
 * AuthResponse.java, UserProfileResponse.java, ApiResponse.java, and the Role/Scope enums.
 */

/** Every successful response body is wrapped in this envelope — apiRequest() unwraps `.data` automatically. */
export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

/**
 * Error bodies use a DIFFERENT shape than success bodies (GlobalExceptionHandler.java
 * builds these by hand, doesn't reuse ApiEnvelope) — `error`, not `message`.
 */
export interface ApiErrorBody {
  timestamp?: string;
  error?: string;
  desc?: string;
  details?: Record<string, string>;
}

export type Role = 'ADMIN' | 'TECHNICIAN' | 'PROCUREMENT' | 'ACCOUNTING' | 'OPERATOR';
export type Scope = 'SUPERVISOR' | 'MANAGER' | 'OWNER' | 'PRINCIPAL';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
  /** Defaults to BLITZ_BDG on the backend if omitted. */
  tenantCode?: string;
  scope?: Scope;
}

/** POST /auth/login and /auth/register both return just this — no user object. */
export interface AuthResponse {
  token: string;
}

/** GET /auth/me — the only place user profile data actually comes from. */
export interface UserProfileResponse {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  scope: Scope | null;
}
