import { getDb } from './db';
import { OUTBOX_TABLE } from './schema';
import { generateUuid } from '../lib/uuid';
import type { EnqueueInput, OutboxItem, OutboxStatus } from './types';

type OutboxRow = {
  id: string;
  kind: string;
  endpoint: string;
  method: string;
  payload: string;
  status: string;
  attempts: number;
  last_error: string | null;
  client_created_at: string;
  server_confirmed_at: string | null;
  origin_node_id: string;
  revision: number;
};

function rowToItem(row: OutboxRow): OutboxItem {
  return {
    id: row.id,
    kind: row.kind,
    endpoint: row.endpoint,
    method: row.method as OutboxItem['method'],
    payload: JSON.parse(row.payload),
    status: row.status as OutboxStatus,
    attempts: row.attempts,
    lastError: row.last_error,
    clientCreatedAt: row.client_created_at,
    serverConfirmedAt: row.server_confirmed_at,
    originNodeId: row.origin_node_id,
    revision: row.revision,
  };
}

export async function enqueue(input: EnqueueInput, originNodeId: string): Promise<OutboxItem> {
  const db = await getDb();
  const item: OutboxItem = {
    id: generateUuid(),
    kind: input.kind,
    endpoint: input.endpoint,
    method: input.method,
    payload: input.payload,
    status: 'pending',
    attempts: 0,
    lastError: null,
    clientCreatedAt: new Date().toISOString(),
    serverConfirmedAt: null,
    originNodeId,
    revision: 1,
  };

  await db.runAsync(
    `INSERT INTO ${OUTBOX_TABLE}
      (id, kind, endpoint, method, payload, status, attempts, last_error, client_created_at, server_confirmed_at, origin_node_id, revision)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      item.id,
      item.kind,
      item.endpoint,
      item.method,
      JSON.stringify(item.payload),
      item.status,
      item.attempts,
      item.lastError,
      item.clientCreatedAt,
      item.serverConfirmedAt,
      item.originNodeId,
      item.revision,
    ],
  );

  return item;
}

export async function listAll(): Promise<OutboxItem[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<OutboxRow>(`SELECT * FROM ${OUTBOX_TABLE} ORDER BY client_created_at ASC`);
  return rows.map(rowToItem);
}

export async function listByStatus(status: OutboxStatus): Promise<OutboxItem[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<OutboxRow>(
    `SELECT * FROM ${OUTBOX_TABLE} WHERE status = ? ORDER BY client_created_at ASC`,
    [status],
  );
  return rows.map(rowToItem);
}

export async function markSending(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`UPDATE ${OUTBOX_TABLE} SET status = 'sending', revision = revision + 1 WHERE id = ?`, [id]);
}

export async function markConfirmed(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE ${OUTBOX_TABLE} SET status = 'confirmed', server_confirmed_at = ?, revision = revision + 1 WHERE id = ?`,
    [new Date().toISOString(), id],
  );
}

export async function markFailed(id: string, error: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE ${OUTBOX_TABLE} SET status = 'failed', attempts = attempts + 1, last_error = ?, revision = revision + 1 WHERE id = ?`,
    [error, id],
  );
}

/** A transient failure (offline, server error): back to pending for the next pass, with the attempt counted. */
export async function markRetryable(id: string, error: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE ${OUTBOX_TABLE} SET status = 'pending', attempts = attempts + 1, last_error = ?, revision = revision + 1 WHERE id = ?`,
    [error, id],
  );
}

/** Resets a failed item back to pending so the processor picks it up again. */
export async function retry(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`UPDATE ${OUTBOX_TABLE} SET status = 'pending', revision = revision + 1 WHERE id = ?`, [id]);
}

/**
 * Items left in 'sending' mean the app was killed mid-request — there's no
 * way to know if the server received it. Reset to pending on startup so the
 * processor retries; the id-as-idempotency-key contract (types.ts) is what
 * makes a duplicate replay safe on the server side.
 */
export async function resetStuckSending(): Promise<void> {
  const db = await getDb();
  await db.runAsync(`UPDATE ${OUTBOX_TABLE} SET status = 'pending', revision = revision + 1 WHERE status = 'sending'`);
}
