import type { SQLiteDatabase } from 'expo-sqlite';
import type {
  NotificationReminderInput,
  NotificationReminderRecord,
  NotificationReminderType,
} from '../../types/app';
import { generateId } from '../utils/ids';

export type { NotificationReminderInput, NotificationReminderRecord };

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

interface NotificationReminderRow {
  id: string;
  medication_id: string;
  schedule_id: string | null;
  expo_notification_id: string;
  reminder_time: string;
  weekday: number | null;
  notification_type: NotificationReminderType;
  created_at: string;
  updated_at: string;
}

function mapRow(row: NotificationReminderRow | null): NotificationReminderRecord | null {
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

export async function createNotificationReminder(
  db: SQLiteDatabase,
  data: NotificationReminderInput
): Promise<NotificationReminderRecord> {
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

export async function getNotificationReminderById(
  db: SQLiteDatabase,
  id: string
): Promise<NotificationReminderRecord | null> {
  const row = await db.getFirstAsync<NotificationReminderRow>(
    `SELECT ${COLUMNS} FROM notification_reminders WHERE id = ?`,
    [id]
  );

  return mapRow(row);
}

export async function getNotificationRemindersByScheduleId(
  db: SQLiteDatabase,
  scheduleId: string
): Promise<NotificationReminderRecord[]> {
  const rows = await db.getAllAsync<NotificationReminderRow>(
    `SELECT ${COLUMNS}
     FROM notification_reminders
     WHERE schedule_id = ?
     ORDER BY reminder_time ASC`,
    [scheduleId]
  );

  return rows.map((row) => mapRow(row)!);
}

export async function getNotificationRemindersByMedicationIdAndType(
  db: SQLiteDatabase,
  medicationId: string,
  notificationType: NotificationReminderType
): Promise<NotificationReminderRecord[]> {
  const rows = await db.getAllAsync<NotificationReminderRow>(
    `SELECT ${COLUMNS}
     FROM notification_reminders
     WHERE medication_id = ? AND notification_type = ?
     ORDER BY reminder_time ASC`,
    [medicationId, notificationType]
  );

  return rows.map((row) => mapRow(row)!);
}

export async function getNotificationRemindersByMedicationId(
  db: SQLiteDatabase,
  medicationId: string
): Promise<NotificationReminderRecord[]> {
  const rows = await db.getAllAsync<NotificationReminderRow>(
    `SELECT ${COLUMNS}
     FROM notification_reminders
     WHERE medication_id = ?
     ORDER BY reminder_time ASC`,
    [medicationId]
  );

  return rows.map((row) => mapRow(row)!);
}

export async function deleteNotificationRemindersByScheduleId(
  db: SQLiteDatabase,
  scheduleId: string
): Promise<number> {
  const result = await db.runAsync(`DELETE FROM notification_reminders WHERE schedule_id = ?`, [
    scheduleId,
  ]);

  return result.changes;
}

export async function deleteNotificationRemindersByMedicationIdAndType(
  db: SQLiteDatabase,
  medicationId: string,
  notificationType: NotificationReminderType
): Promise<{ changes: number; reminders: NotificationReminderRecord[] }> {
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

export async function deleteNotificationRemindersByMedicationId(
  db: SQLiteDatabase,
  medicationId: string
): Promise<number> {
  const result = await db.runAsync(`DELETE FROM notification_reminders WHERE medication_id = ?`, [
    medicationId,
  ]);

  return result.changes;
}
