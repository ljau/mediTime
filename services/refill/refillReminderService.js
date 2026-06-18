import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getLowStockMedications } from '../../database/repositories/inventory';
import { getMedicationById } from '../../database/repositories/medications';
import {
  createNotificationReminder,
  deleteNotificationRemindersByMedicationIdAndType,
  getNotificationRemindersByMedicationIdAndType,
} from '../../database/repositories/notification_reminders';
import { isLowStock, STOCK_STATUS } from '../../utils/inventory';
import {
  buildRefillNotificationContent,
  createNotificationIdentifier,
  REFILL_CHANNEL_ID,
  requestNotificationPermissions,
} from '../notifications';

/**
 * @typedef {import('../../database/repositories/medications').MedicationRecord} MedicationRecord
 */

/**
 * @typedef {Object} RefillReminderResult
 * @property {typeof STOCK_STATUS[keyof typeof STOCK_STATUS]} stockStatus
 * @property {boolean} notified
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
 * Cancel stored refill reminders for a medication.
 * @param {import('expo-sqlite').SQLiteDatabase} db
 * @param {string} medicationId
 */
export async function cancelRefillReminders(db, medicationId) {
  const { reminders } = await deleteNotificationRemindersByMedicationIdAndType(
    db,
    medicationId,
    'refill'
  );

  await Promise.all(reminders.map((r) => cancelExpoNotification(r.expoNotificationId)));

  return reminders.length;
}

/**
 * Send an immediate refill reminder notification and persist the record.
 * @param {import('expo-sqlite').SQLiteDatabase} db
 * @param {MedicationRecord} medication
 */
export async function sendRefillReminderNotification(db, medication) {
  const permissions = await requestNotificationPermissions();
  if (!permissions.granted) {
    return null;
  }

  const expoNotificationId = createNotificationIdentifier();
  const content = buildRefillNotificationContent(medication);
  const reminderTime = new Date().toISOString().slice(11, 16);

  try {
    await Notifications.scheduleNotificationAsync({
      identifier: expoNotificationId,
      content: {
        title: content.title,
        body: content.body,
        data: content.data,
        sound: true,
      },
      trigger:
        Platform.OS === 'android'
          ? {
              type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
              seconds: 1,
              channelId: REFILL_CHANNEL_ID,
            }
          : null,
    });
  } catch {
    // Local notifications are limited in Expo Go (SDK 53+). Use a dev build for full support.
    return null;
  }

  return createNotificationReminder(db, {
    medicationId: medication.id,
    scheduleId: null,
    expoNotificationId,
    reminderTime,
    weekday: null,
    notificationType: 'refill',
  });
}

/**
 * Evaluate inventory and send or clear refill reminders as needed.
 * @param {import('expo-sqlite').SQLiteDatabase} db
 * @param {string} medicationId
 * @param {{ previousCount?: number }} [options]
 * @returns {Promise<RefillReminderResult>}
 */
export async function processRefillReminder(db, medicationId, options = {}) {
  const medication = await getMedicationById(db, medicationId);
  if (!medication) {
    return { stockStatus: STOCK_STATUS.NORMAL, notified: false };
  }

  const currentlyLowStock = isLowStock(medication);

  if (!currentlyLowStock) {
    await cancelRefillReminders(db, medicationId);
    return { stockStatus: STOCK_STATUS.NORMAL, notified: false };
  }

  const crossedThreshold =
    options.previousCount !== undefined &&
    options.previousCount > medication.refillThreshold;

  const existingReminders = await getNotificationRemindersByMedicationIdAndType(
    db,
    medicationId,
    'refill'
  );

  const shouldNotify = crossedThreshold || existingReminders.length === 0;

  if (shouldNotify) {
    if (existingReminders.length > 0) {
      await cancelRefillReminders(db, medicationId);
    }

    await sendRefillReminderNotification(db, medication);
    return { stockStatus: STOCK_STATUS.LOW_STOCK, notified: true };
  }

  return { stockStatus: STOCK_STATUS.LOW_STOCK, notified: false };
}

/**
 * Check all medications and ensure low-stock items have refill reminders.
 * @param {import('expo-sqlite').SQLiteDatabase} db
 */
export async function syncAllRefillReminders(db) {
  const lowStockMedications = await getLowStockMedications(db);
  const results = [];

  for (const medication of lowStockMedications) {
    const result = await processRefillReminder(db, medication.id);
    results.push({ medicationId: medication.id, ...result });
  }

  return results;
}
