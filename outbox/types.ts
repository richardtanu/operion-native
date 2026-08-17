export type OutboxStatus = 'pending' | 'sending' | 'confirmed' | 'failed';

/**
 * Row shape carries the plan's six data-model invariants (plan.md §1) from
 * day one, even though no real write screens exist yet — retrofitting them
 * onto rows already in the field would be a real migration, adding the
 * columns now costs nothing.
 */
export interface OutboxItem<TPayload = unknown> {
  /** Client-generated UUID — primary key AND the idempotency key sent to the server on every replay attempt. */
  id: string;
  /** Discriminates payload shape / target endpoint for future write kinds, e.g. 'scan.take'. */
  kind: string;
  /** Relative API path this item replays against. */
  endpoint: string;
  method: 'POST' | 'PATCH' | 'PUT';
  payload: TPayload;
  status: OutboxStatus;
  attempts: number;
  lastError: string | null;
  /** ISO 8601 — when the operator actually performed the action (dual timestamp #1). */
  clientCreatedAt: string;
  /** ISO 8601 — when the server acknowledged it (dual timestamp #2). Null until confirmed. */
  serverConfirmedAt: string | null;
  /** This device's persisted install UUID. */
  originNodeId: string;
  /** Monotonic counter, bumped on every local mutation/retry of this item. */
  revision: number;
}

export type EnqueueInput<TPayload = unknown> = Pick<OutboxItem<TPayload>, 'kind' | 'endpoint' | 'method' | 'payload'>;
