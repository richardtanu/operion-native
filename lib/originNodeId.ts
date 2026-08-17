import * as SecureStore from 'expo-secure-store';
import { generateUuid } from './uuid';

const STORAGE_KEY = 'operion.originNodeId';

let cached: string | null = null;

/**
 * Per-install UUID, generated once and persisted. Part of the plan's
 * `origin_node_id` + `revision` invariant (plan.md §1) — doesn't do anything
 * for a single-device replay queue today, but is what makes a future
 * multi-device-per-outlet scenario non-breaking, so it's captured on every
 * outbox item from day one rather than retrofitted later.
 */
export async function getOriginNodeId(): Promise<string> {
  if (cached) return cached;

  const existing = await SecureStore.getItemAsync(STORAGE_KEY);
  if (existing) {
    cached = existing;
    return existing;
  }

  const generated = generateUuid();
  await SecureStore.setItemAsync(STORAGE_KEY, generated);
  cached = generated;
  return generated;
}
