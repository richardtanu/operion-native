import { apiRequest } from '../api/client';
import { ApiError } from '../api/httpError';
import { listByStatus, markConfirmed, markFailed, markRetryable, markSending } from './outboxStore';

/**
 * A 5xx is retried this many times before the item is marked failed. Since
 * BE-12 the backend answers unknown paths with 404 and wrong methods with
 * 405, so a 5xx is a real server fault — often transient (a redeploy), but
 * a write that keeps hitting one must not replay against production forever.
 */
const MAX_SERVER_ERROR_ATTEMPTS = 5;

/**
 * FIFO replay: pulls pending items in creation order and posts them one at a
 * time (not in parallel — ordering matters for a write queue). Each request
 * carries the item's own id as an idempotency key, so a request that
 * actually succeeded server-side but failed to return a response here can
 * be safely replayed.
 *
 * Failures split three ways:
 * - no response at all (offline, DNS, tunnel down): stays pending, no cap —
 *   surviving that is the reason the outbox exists;
 * - 5xx: stays pending up to MAX_SERVER_ERROR_ATTEMPTS, then failed;
 * - 4xx (400 bad input or SoD, 401, 403 not allowed, 404, 405, 409): failed
 *   at once — replaying the same request can't change the answer.
 * A transient failure stops the pass, so later items never overtake it.
 */
export async function processPending(token: string | null): Promise<void> {
  const pending = await listByStatus('pending');

  for (const item of pending) {
    await markSending(item.id);
    try {
      await apiRequest(item.endpoint, {
        method: item.method,
        body: item.payload,
        token,
        headers: { 'Idempotency-Key': item.id },
      });
      await markConfirmed(item.id);
    } catch (err) {
      if (!(err instanceof ApiError)) {
        await markRetryable(item.id, `network: ${String(err)}`);
        return;
      }
      const message = `${err.status}: ${err.message}`;
      if (err.status >= 500 && item.attempts + 1 < MAX_SERVER_ERROR_ATTEMPTS) {
        await markRetryable(item.id, message);
        return;
      }
      await markFailed(item.id, message);
    }
  }
}
