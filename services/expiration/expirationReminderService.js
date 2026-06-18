import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getMedicationsWithExpiration } from '../../database/repositories/expiration';
import { getMedicationById } from '../../database/repositories/medications';
import {
  createNotificationReminder,
  deleteNotificationRemindersByMedicationIdAndType,
  getNotificationRemindersByMedicationIdAndType,
} from '../../database/repositories/notification_reminders';
import {
  EXPIRATION_STATUS,
  getExpirationAlertTargets,
  getExpirationStatus,
  isExpired,
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

/**
 * @typedef {import('../../database/repositories/medications').MedicationRecord} MedicationRecord
 */

/**
 * @typedef {Object} ExpirationReminderResult
 * @property {typeof EXPIRATION_STATUS[keyof typeof EXPIRATION_STATUS]} expirationStatus
 * @property {number} scheduledCount
 */

/**
 * @param {string} expoNotificationId
 */
async function cancelExpoNotification(expoNotificationId) {
  try {
    await Notifications.cancelScheduledNotificationAsync(expoNotificationId);
  } catch {
    // Notification may already have fired or been cleared by the OS.
  }
}

/**
 * @param {string} alertDate YYYY-MM-DD
 * @returns {Date}
 */
function alertDateAtLocalTime(alertDate) {
  const [year, month, day] = alertDate.split('-').map(Number);
  return new Date(year, month - 1, day, ALERT_HOUR, ALERT_MINUTE, 0);
}

/**
 * Cancel stored expiration reminders for a medication.
 * @param {import('expo-sqlite').SQLiteDatabase} db
 * @param {string} medicationId
 */
export async function cancelExpirationReminders(db, medicationId) {
  const { reminders } = await deleteNotificationRemindersByMedicationIdAndType(
    db,
    medicationId,
    'expiration'
  );

  await Promise.all(reminders.map((r) => cancelExpoNotification(r.expoNotificationId)));

  return reminders.length;
}

/**
 * Schedule a single expiration alert notification.
 * @param {import('expo-sqlite').SQLiteDatabase} db
 * @param {MedicationRecord} medication
 * @param {{ daysBefore: number, alertDate: string }} target
 */
async function scheduleExpirationAlert(db, medication, target) {
  const expoNotificationId = createNotificationIdentifier();
  const content = buildExpirationNotificationContent(medication, target);
  const triggerDate = alertDateAtLocalTime(target.alertDate);
  const now = new Date();

  const trigger =
    triggerDate <= now
      ? Platform.OS === 'android'
        ? {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: 1,
            channelId: EXPIRATION_CHANNEL_ID,
          }
        : null
      : {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
          channelId: Platform.OS === 'android' ? EXPIRATION_CHANNEL_ID : undefined,
        };

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

/**
 * Reschedule all future expiration alerts for a medication.
 * @param {import('expo-sqlite').SQLiteDatabase} db
 * @param {MedicationRecord} medication
 */
export async function scheduleExpirationReminders(db, medication) {
  await cancelExpirationReminders(db, medication.id);

  if (!medication.expirationDate || isExpired(medication.expirationDate)) {
    return [];
  }

  const permissions = await requestNotificationPermissions();
  if (!permissions.granted) {
    return [];
  }

  const targets = getExpirationAlertTargets(medication.expirationDate);
  const created = [];

  for (const target of targets) {
    const record = await scheduleExpirationAlert(db, medication, target);
    if (record) {
      created.push(record);
    }
  }

  return created;
}

/**
 * Evaluate expiration date and schedule or clear reminders as needed.
 * @param {import('expo-sqlite').SQLiteDatabase} db
 * @param {string} medicationId
 * @returns {Promise<ExpirationReminderResult>}
 */
export async function processExpirationReminder(db, medicationId) {
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

/**
 * Re-evaluate expiration reminders after a medication create or update.
 * @param {import('expo-sqlite').SQLiteDatabase} db
 * @param {string} medicationId
 */
export async function checkExpirationReminder(db, medicationId) {
  return processExpirationReminder(db, medicationId);
}

/**
 * Ensure all medications with expiration dates have scheduled reminders.
 * @param {import('expo-sqlite').SQLiteDatabase} db
 */
export async function syncAllExpirationReminders(db) {
  const medications = await getMedicationsWithExpiration(db);
  const results = [];

  for (const medication of medications) {
    const result = await processExpirationReminder(db, medication.id);
    results.push({ medicationId: medication.id, ...result });
  }

  return results;
}
