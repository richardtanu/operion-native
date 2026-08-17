import { apiRequest } from '../api/client';
import { ApiError } from '../api/httpError';
import { listByStatus, markConfirmed, markFailed, markSending } from './outboxStore';

/**
 * FIFO replay: pulls pending items in creation order and posts them one at a
 * time (not in parallel — ordering matters for a write queue). Each request
 * carries the item's own id as an idempotency key, so a request that
 * actually succeeded server-side but failed to return a response here can
 * be safely replayed.
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
      const message = err instanceof ApiError ? `${err.status}: ${err.message}` : String(err);
      await markFailed(item.id, message);
    }
  }
}
