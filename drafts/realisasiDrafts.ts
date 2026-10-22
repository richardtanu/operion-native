import * as SQLite from 'expo-sqlite';
import { generateUuid } from '../lib/uuid';

/**
 * Unfinished PROC-04 purchases, kept on this phone only (decision #11, 20 Oct
 * 2026). The SM often logs a purchase before the final price or items are
 * known, so a half-filled form is saved here until it's created or discarded.
 * Separate database file from the outbox: a draft is never sent anywhere, and
 * the outbox schema stays untouched.
 *
 * Drafts are scoped to the signed-in user, so on a shared HQ phone one
 * person never sees another's unfinished purchases.
 */

const DATABASE_NAME = 'operion-drafts.db';
const TABLE = 'realisasi_drafts';

/** A draft older than this gets a dashboard reminder: the money is spent but invisible to the Owner. */
export const STALE_DRAFT_DAYS = 3;

/** The form as the user left it. Every field is the raw text they typed. */
export type RealisasiDraftForm = {
  praId: string | null;
  praItemId: string | null;
  partName: string | null;
  channel: string;
  supplierId: string | null;
  paymentMethod: string;
  paymentRef: string;
  purchasedAt: string;
  attachments: string;
  subtotal: string;
  sellerDiscount: string;
  platformVoucher: string;
  shipping: string;
  insurance: string;
  serviceFee: string;
  purchasedQty: string;
  actualUnitPrice: string;
};

export type RealisasiDraft = {
  id: string;
  form: RealisasiDraftForm;
  step: 0 | 1 | 2;
  createdAt: string;
  updatedAt: string;
};

type DraftRow = {
  id: string;
  user_id: string;
  payload: string;
  step: number;
  created_at: string;
  updated_at: string;
};

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DATABASE_NAME).then(async (db) => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS ${TABLE} (
          id TEXT PRIMARY KEY NOT NULL,
          user_id TEXT NOT NULL,
          payload TEXT NOT NULL,
          step INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_${TABLE}_user ON ${TABLE} (user_id, created_at);
      `);
      return db;
    });
  }
  return dbPromise;
}

function rowToDraft(row: DraftRow): RealisasiDraft {
  return {
    id: row.id,
    form: JSON.parse(row.payload),
    step: Math.min(2, Math.max(0, row.step)) as 0 | 1 | 2,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Creates a draft when `id` is null, otherwise overwrites it. Returns the draft's id. */
export async function saveDraft(userId: string, id: string | null, form: RealisasiDraftForm, step: 0 | 1 | 2): Promise<string> {
  const db = await getDb();
  const now = new Date().toISOString();
  if (id) {
    await db.runAsync(`UPDATE ${TABLE} SET payload = ?, step = ?, updated_at = ? WHERE id = ? AND user_id = ?`, [
      JSON.stringify(form),
      step,
      now,
      id,
      userId,
    ]);
    return id;
  }
  const newId = generateUuid();
  await db.runAsync(
    `INSERT INTO ${TABLE} (id, user_id, payload, step, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
    [newId, userId, JSON.stringify(form), step, now, now],
  );
  return newId;
}

/** Newest first. */
export async function listDrafts(userId: string): Promise<RealisasiDraft[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<DraftRow>(`SELECT * FROM ${TABLE} WHERE user_id = ? ORDER BY created_at DESC`, [userId]);
  return rows.map(rowToDraft);
}

export async function deleteDraft(userId: string, id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM ${TABLE} WHERE id = ? AND user_id = ?`, [id, userId]);
}

/** Whole days since the draft was started. */
export function draftAgeDays(draft: RealisasiDraft, now: Date = new Date()): number {
  return Math.floor((now.getTime() - new Date(draft.createdAt).getTime()) / 86_400_000);
}

/** Drafts started at least STALE_DRAFT_DAYS ago, for the dashboard reminder. */
export async function countStaleDrafts(userId: string): Promise<number> {
  const drafts = await listDrafts(userId);
  return drafts.filter((d) => draftAgeDays(d) >= STALE_DRAFT_DAYS).length;
}
