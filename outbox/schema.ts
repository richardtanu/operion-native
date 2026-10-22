export const OUTBOX_TABLE = 'outbox_items';

export const CREATE_OUTBOX_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS ${OUTBOX_TABLE} (
  id TEXT PRIMARY KEY NOT NULL,
  kind TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  payload TEXT NOT NULL,
  status TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  client_created_at TEXT NOT NULL,
  server_confirmed_at TEXT,
  origin_node_id TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_${OUTBOX_TABLE}_status ON ${OUTBOX_TABLE} (status, client_created_at);
`;
