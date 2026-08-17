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
    const message = (data && typeof data === 'object' && 'message' in data && String(data.message)) || response.statusText;
    throw new ApiError(response.status, message, data);
  }

  return data as TResponse;
}
