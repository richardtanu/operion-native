/**
 * Hand-written, intentionally minimal. No OpenAPI spec is published by the
 * backend project (a separate local project — see plan.md §1), so these
 * shapes are a best guess at the auth contract and will need to be kept in
 * sync by hand until/unless that changes.
 */

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken?: string;
  user: AuthUser;
}
