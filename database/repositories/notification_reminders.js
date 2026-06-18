import { generateId } from '../utils/ids';

const COLUMNS = `
  id,
  medication_id,
  schedule_id,
  expo_notification_id,
  reminder_time,
  weekday,
  notification_type,
  created_at,
  updated_at
`;

/**
 * @typedef {Object} NotificationReminderRecord
 * @property {string} id
 * @property {string} medicationId
 * @property {string|null} scheduleId
 * @property {string} expoNotificationId
 * @property {string} reminderTime
 * @property {number|null} weekday
 * @property {'medication'|'refill'|'expiration'} notificationType
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * @typedef {Object} NotificationReminderInput
 * @property {string} medicationId
 * @property {string|null} [scheduleId]
 * @property {string} expoNotificationId
 * @property {string} reminderTime
 * @property {number|null} [weekday]
 * @property {'medication'|'refill'|'expiration'} [notificationType]
 */

function mapRow(row) {
  if (!row) return null;

  return {
    id: row.id,
    medicationId: row.medication_id,
    scheduleId: row.schedule_id,
    expoNotificationId: row.expo_notification_id,
    reminderTime: row.reminder_time,
    weekday: row.weekday,
    notificationType: row.notification_type,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * @param {import('expo-sqlite').SQLiteDatabase} db
 * @param {NotificationReminderInput} data
 * @returns {Promise<NotificationReminderRecord>}
 */
export async function createNotificationReminder(db, data) {
  const id = generateId();
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO notification_reminders (
      id,
      medication_id,
      schedule_id,
      expo_notification_id,
      reminder_time,
      weekday,
      notification_type,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.medicationId,
      data.scheduleId ?? null,
      data.expoNotificationId,
      data.reminderTime,
      data.weekday ?? null,
      data.notificationType ?? 'medication',
      now,
      now,
    ]
  );

  const record = await getNotificationReminderById(db, id);
  if (!record) {
    throw new Error('Failed to create notification reminder record');
  }

  return record;
}

/**
 * @param {import('expo-sqlite').SQLiteDatabase} db
 * @param {string} id
 * @returns {Promise<NotificationReminderRecord|null>}
 */
export async function getNotificationReminderById(db, id) {
  const row = await db.getFirstAsync(
    `SELECT ${COLUMNS} FROM notification_reminders WHERE id = ?`,
    [id]
  );

  return mapRow(row);
}

/**
 * @param {import('expo-sqlite').SQLiteDatabase} db
 * @param {string} scheduleId
 * @returns {Promise<NotificationReminderRecord[]>}
 */
export async function getNotificationRemindersByScheduleId(db, scheduleId) {
  const rows = await db.getAllAsync(
    `SELECT ${COLUMNS}
     FROM notification_reminders
     WHERE schedule_id = ?
     ORDER BY reminder_time ASC`,
    [scheduleId]
  );

  return rows.map(mapRow);
}

/**
 * @param {import('expo-sqlite').SQLiteDatabase} db
 * @param {string} medicationId
 * @param {'medication'|'refill'|'expiration'} notificationType
 * @returns {Promise<NotificationReminderRecord[]>}
 */
export async function getNotificationRemindersByMedicationIdAndType(
  db,
  medicationId,
  notificationType
) {
  const rows = await db.getAllAsync(
    `SELECT ${COLUMNS}
     FROM notification_reminders
     WHERE medication_id = ? AND notification_type = ?
     ORDER BY reminder_time ASC`,
    [medicationId, notificationType]
  );

  return rows.map(mapRow);
}

/**
 * @param {import('expo-sqlite').SQLiteDatabase} db
 * @param {string} medicationId
 * @returns {Promise<NotificationReminderRecord[]>}
 */
export async function getNotificationRemindersByMedicationId(db, medicationId) {
  const rows = await db.getAllAsync(
    `SELECT ${COLUMNS}
     FROM notification_reminders
     WHERE medication_id = ?
     ORDER BY reminder_time ASC`,
    [medicationId]
  );

  return rows.map(mapRow);
}

/**
 * @param {import('expo-sqlite').SQLiteDatabase} db
 * @param {string} scheduleId
 * @returns {Promise<number>}
 */
export async function deleteNotificationRemindersByScheduleId(db, scheduleId) {
  const result = await db.runAsync(
    `DELETE FROM notification_reminders WHERE schedule_id = ?`,
    [scheduleId]
  );

  return result.changes;
}

/**
 * @param {import('expo-sqlite').SQLiteDatabase} db
 * @param {string} medicationId
 * @param {'medication'|'refill'|'expiration'} notificationType
 * @returns {Promise<number>}
 */
export async function deleteNotificationRemindersByMedicationIdAndType(
  db,
  medicationId,
  notificationType
) {
  const reminders = await getNotificationRemindersByMedicationIdAndType(
    db,
    medicationId,
    notificationType
  );

  const result = await db.runAsync(
    `DELETE FROM notification_reminders
     WHERE medication_id = ? AND notification_type = ?`,
    [medicationId, notificationType]
  );

  return { changes: result.changes, reminders };
}

/**
 * @param {import('expo-sqlite').SQLiteDatabase} db
 * @param {string} medicationId
 * @returns {Promise<number>}
 */
export async function deleteNotificationRemindersByMedicationId(db, medicationId) {
  const result = await db.runAsync(
    `DELETE FROM notification_reminders WHERE medication_id = ?`,
    [medicationId]
  );

  return result.changes;
}
