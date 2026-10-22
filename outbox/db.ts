import * as SQLite from 'expo-sqlite';
import { CREATE_OUTBOX_TABLE_SQL } from './schema';

const DATABASE_NAME = 'operion-outbox.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * Opens (or creates) the outbox database and runs its migration exactly
 * once per process. SQLite over AsyncStorage/MMKV because the outbox is
 * structurally a table — status, attempts, and FIFO ordering need real
 * query semantics, not a hand-rolled index over a serialized blob — and it
 * gives durable, transactional, file-backed storage that survives the app
 * being backgrounded, which is the exact guarantee plan.md §1 cites as the
 * reason RN was chosen over a PWA in the first place.
 */
export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DATABASE_NAME).then(async (db) => {
      await db.execAsync(CREATE_OUTBOX_TABLE_SQL);
      return db;
    });
  }
  return dbPromise;
}
