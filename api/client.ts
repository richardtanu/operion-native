import { getApiBaseUrl } from './env';
import { ApiError } from './httpError';

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  /** Bearer token attached automatically when provided — callers don't manage auth headers themselves. */
  token?: string | null;
};

let unauthorizedHandler: (() => void) | null = null;

/** AuthContext registers its logout here, so any screen's 401 ends the session in one place. */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

/** `?a=1&b=2` from an object of optional filters; empty values are left out. */
export function queryString(params: object): string {
  const pairs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return pairs.length ? `?${pairs.join('&')}` : '';
}

/**
 * Thin fetch wrapper: base URL, bearer header, JSON parse, error
 * normalization. No axios/ky — a handful of hand-written endpoints against
 * an API with no published spec doesn't justify a request library yet
 * (revisit if interception/retry needs grow past what this can hold).
 *
 * Every success response from the real backend (checked against
 * c:\demo\src\main\java\...\common\response\ApiResponse.java and multiple
 * controllers) is wrapped as {success, message, data} — this unwraps `.data`
 * automatically so callers work with the actual payload type, not the
 * envelope. Error bodies use a DIFFERENT shape (GlobalExceptionHandler.java
 * builds them by hand): {timestamp, error, ...} — note `error`, not `message`.
 */
export async function apiRequest<TResponse>(path: string, options: RequestOptions = {}): Promise<TResponse> {
  const { method = 'GET', body, headers = {}, token } = options;

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  // JwtAuthenticationFilter answers a bad/expired token with a plain-text
  // 401 ("Invalid JWT token"), not JSON — parsing it blindly would throw a
  // SyntaxError instead of the ApiError callers branch on.
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : undefined;
  } catch {
    data = text;
  }

  // 401 only ever means the token itself was rejected (expired after 24h,
  // or JWT_SECRET rotated). 403 is NOT a dead session since BE-12: it is a
  // permission denial, and the user stays signed in.
  if (response.status === 401 && token) {
    unauthorizedHandler?.();
  }

  if (!response.ok) {
    const errorBody: object = data && typeof data === 'object' ? data : typeof data === 'string' && data ? { error: data } : {};
    const baseMessage =
      ('error' in errorBody && String(errorBody.error)) ||
      ('message' in errorBody && String(errorBody.message)) ||
      response.statusText;
    // GlobalExceptionHandler puts per-field messages here on a validation
    // failure (e.g. {requestedBy: "must not be null"}) but the top-level
    // `error` string is always the generic "Validation failed" — without
    // this the UI has no way to say what actually needs fixing.
    const details = 'details' in errorBody && errorBody.details && typeof errorBody.details === 'object' ? (errorBody.details as Record<string, unknown>) : null;
    const detailText = details ? Object.entries(details).map(([field, msg]) => `${field}: ${msg}`).join('; ') : null;
    const message = detailText ? `${baseMessage} — ${detailText}` : baseMessage;
    throw new ApiError(response.status, message, data);
  }

  // Spring Security's own rejections (e.g. a 403 with no body from the
  // filter chain, before a controller ever runs) never reach
  // GlobalExceptionHandler and won't carry the {success,message,data}
  // envelope either — guard against unwrapping something that isn't one.
  if (data && typeof data === 'object' && 'data' in data && 'success' in data) {
    return data.data as TResponse;
  }
  return data as TResponse;
}
