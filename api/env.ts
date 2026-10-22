/**
 * Typed read of the API base URL. Asserts on first use rather than at module
 * load — so the app still boots and can render a real error screen (per the
 * plan's "blocking error, manual retry" failure behaviour) instead of a
 * Metro-level crash before anything renders.
 */
export function getApiBaseUrl(): string {
  const url = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (!url) {
    throw new Error(
      'EXPO_PUBLIC_API_BASE_URL is not set. Copy .env.example to .env and point it at the backend project.',
    );
  }
  return url;
}
