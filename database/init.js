import * as SQLite from 'expo-sqlite';
import { SCHEMA_SQL } from './schemaContent';

export const DATABASE_NAME = 'meditime.db';

let databaseInstance = null;
let initPromise = null;

/**
 * Recreate notification_reminders when the table predates the expiration type.
 * @param {import('expo-sqlite').SQLiteDatabase} db
 */
async function migrateNotificationRemindersForExpiration(db) {
  const tableRow = await db.getFirstAsync(
    `SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'notification_reminders'`
  );

  if (!tableRow?.sql || tableRow.sql.includes("'expiration'")) {
    return;
  }

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS notification_reminders_new (
      id                    TEXT PRIMARY KEY NOT NULL,
      medication_id         TEXT NOT NULL,
      schedule_id           TEXT,
      expo_notification_id  TEXT NOT NULL UNIQUE,
      reminder_time         TEXT NOT NULL,
      weekday               INTEGER CHECK (weekday IS NULL OR weekday BETWEEN 1 AND 7),
      notification_type     TEXT NOT NULL DEFAULT 'medication'
        CHECK (notification_type IN ('medication', 'refill', 'expiration')),
      created_at            TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at            TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (medication_id) REFERENCES medications (id) ON DELETE CASCADE,
      FOREIGN KEY (schedule_id) REFERENCES schedules (id) ON DELETE CASCADE
    );

    INSERT INTO notification_reminders_new (
      id,
      medication_id,
      schedule_id,
      expo_notification_id,
      reminder_time,
      weekday,
      notification_type,
      created_at,
      updated_at
    )
    SELECT
      id,
      medication_id,
      schedule_id,
      expo_notification_id,
      reminder_time,
      weekday,
      notification_type,
      created_at,
      updated_at
    FROM notification_reminders;

    DROP TABLE notification_reminders;
    ALTER TABLE notification_reminders_new RENAME TO notification_reminders;

    CREATE INDEX IF NOT EXISTS idx_notification_reminders_schedule
      ON notification_reminders (schedule_id);

    CREATE INDEX IF NOT EXISTS idx_notification_reminders_medication
      ON notification_reminders (medication_id);
  `);
}

/**
 * Open (or return cached) SQLite database handle.
 */
export async function getDatabase() {
  if (databaseInstance) {
    return databaseInstance;
  }

  if (!initPromise) {
    initPromise = initializeDatabase();
  }

  return initPromise;
}

/**
 * Create tables and enable foreign keys on first launch.
 */
export async function initializeDatabase() {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);

  await db.execAsync('PRAGMA foreign_keys = ON;');
  await db.execAsync(SCHEMA_SQL);
  await migrateNotificationRemindersForExpiration(db);

  databaseInstance = db;
  return db;
}

/**
 * Close the database connection (useful for tests or reset flows).
 */
export async function closeDatabase() {
  if (databaseInstance) {
    await databaseInstance.closeAsync();
    databaseInstance = null;
    initPromise = null;
  }
}
