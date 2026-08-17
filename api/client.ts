import { getApiBaseUrl } from './env';
import { ApiError } from './httpError';

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  /** Bearer token attached automatically when provided — callers don't manage auth headers themselves. */
  token?: string | null;
};

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
  const data = text ? JSON.parse(text) : undefined;

  if (!response.ok) {
    const errorBody = data && typeof data === 'object' ? data : {};
    const message =
      ('error' in errorBody && String(errorBody.error)) ||
      ('message' in errorBody && String(errorBody.message)) ||
      response.statusText;
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
