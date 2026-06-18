import * as Notifications from 'expo-notifications';
import type { SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';
import { getMedicationsWithExpiration } from '../../database/repositories/expiration';
import { getMedicationById } from '../../database/repositories/medications';
import {
  createNotificationReminder,
  deleteNotificationRemindersByMedicationIdAndType,
  getNotificationRemindersByMedicationIdAndType,
} from '../../database/repositories/notification_reminders';
import type { MedicationRecord, NotificationReminderRecord } from '../../types/app';
import {
  EXPIRATION_STATUS,
  getExpirationAlertTargets,
  getExpirationStatus,
  isExpired,
  type ExpirationAlertTarget,
  type ExpirationStatus,
} from '../../utils/inventory';
import {
  buildExpirationNotificationContent,
  createNotificationIdentifier,
  EXPIRATION_CHANNEL_ID,
  requestNotificationPermissions,
} from '../notifications';

/** Local notification hour for expiration alerts. */
const ALERT_HOUR = 9;
const ALERT_MINUTE = 0;

export interface ExpirationReminderResult {
  expirationStatus: ExpirationStatus;
  scheduledCount: number;
}

async function cancelExpoNotification(expoNotificationId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(expoNotificationId);
  } catch {
    // Notification may already have fired or been cleared by the OS.
  }
}

function alertDateAtLocalTime(alertDate: string): Date {
  const [year, month, day] = alertDate.split('-').map(Number);
  return new Date(year, month - 1, day, ALERT_HOUR, ALERT_MINUTE, 0);
}

export async function cancelExpirationReminders(
  db: SQLiteDatabase,
  medicationId: string
): Promise<number> {
  const { reminders } = await deleteNotificationRemindersByMedicationIdAndType(
    db,
    medicationId,
    'expiration'
  );

  await Promise.all(reminders.map((r) => cancelExpoNotification(r.expoNotificationId)));

  return reminders.length;
}

async function scheduleExpirationAlert(
  db: SQLiteDatabase,
  medication: MedicationRecord,
  target: ExpirationAlertTarget
): Promise<NotificationReminderRecord | null> {
  const expoNotificationId = createNotificationIdentifier();
  const content = buildExpirationNotificationContent(medication, target);
  const triggerDate = alertDateAtLocalTime(target.alertDate);
  const now = new Date();

  let trigger: Notifications.NotificationTriggerInput | null;

  if (triggerDate <= now) {
    trigger =
      Platform.OS === 'android'
        ? {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: 1,
            channelId: EXPIRATION_CHANNEL_ID,
          }
        : null;
  } else {
    trigger = {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
      channelId: Platform.OS === 'android' ? EXPIRATION_CHANNEL_ID : undefined,
    };
  }

  if (!trigger) {
    return null;
  }

  try {
    await Notifications.scheduleNotificationAsync({
      identifier: expoNotificationId,
      content: {
        title: content.title,
        body: content.body,
        data: content.data,
        sound: true,
      },
      trigger,
    });
  } catch {
    return null;
  }

  return createNotificationReminder(db, {
    medicationId: medication.id,
    scheduleId: null,
    expoNotificationId,
    reminderTime: target.alertDate,
    weekday: null,
    notificationType: 'expiration',
  });
}

export async function scheduleExpirationReminders(
  db: SQLiteDatabase,
  medication: MedicationRecord
): Promise<NotificationReminderRecord[]> {
  await cancelExpirationReminders(db, medication.id);

  if (!medication.expirationDate || isExpired(medication.expirationDate)) {
    return [];
  }

  const permissions = await requestNotificationPermissions();
  if (!permissions.granted) {
    return [];
  }

  const targets = getExpirationAlertTargets(medication.expirationDate);
  const created: NotificationReminderRecord[] = [];

  for (const target of targets) {
    const record = await scheduleExpirationAlert(db, medication, target);
    if (record) {
      created.push(record);
    }
  }

  return created;
}

export async function processExpirationReminder(
  db: SQLiteDatabase,
  medicationId: string
): Promise<ExpirationReminderResult> {
  const medication = await getMedicationById(db, medicationId);
  if (!medication) {
    return { expirationStatus: EXPIRATION_STATUS.NORMAL, scheduledCount: 0 };
  }

  const expirationStatus = getExpirationStatus(medication);

  if (!medication.expirationDate || expirationStatus === EXPIRATION_STATUS.EXPIRED) {
    await cancelExpirationReminders(db, medicationId);
    return { expirationStatus, scheduledCount: 0 };
  }

  const existingReminders = await getNotificationRemindersByMedicationIdAndType(
    db,
    medicationId,
    'expiration'
  );

  const expectedTargets = getExpirationAlertTargets(medication.expirationDate);
  const expectedDates = new Set(expectedTargets.map((t) => t.alertDate));
  const existingDates = new Set(existingReminders.map((r) => r.reminderTime));

  const needsReschedule =
    existingReminders.length !== expectedTargets.length ||
    [...expectedDates].some((date) => !existingDates.has(date));

  if (needsReschedule) {
    const created = await scheduleExpirationReminders(db, medication);
    return { expirationStatus, scheduledCount: created.length };
  }

  return { expirationStatus, scheduledCount: existingReminders.length };
}

export async function checkExpirationReminder(
  db: SQLiteDatabase,
  medicationId: string
): Promise<ExpirationReminderResult> {
  return processExpirationReminder(db, medicationId);
}

export async function syncAllExpirationReminders(db: SQLiteDatabase) {
  const medications = await getMedicationsWithExpiration(db);
  const results: Array<{ medicationId: string } & ExpirationReminderResult> = [];

  for (const medication of medications) {
    const result = await processExpirationReminder(db, medication.id);
    results.push({ medicationId: medication.id, ...result });
  }

  return results;
}
