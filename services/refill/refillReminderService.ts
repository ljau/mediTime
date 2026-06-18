import * as Notifications from 'expo-notifications';
import type { SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';
import { getLowStockMedications } from '../../database/repositories/inventory';
import { getMedicationById } from '../../database/repositories/medications';
import {
  createNotificationReminder,
  deleteNotificationRemindersByMedicationIdAndType,
  getNotificationRemindersByMedicationIdAndType,
} from '../../database/repositories/notification_reminders';
import type { MedicationRecord, NotificationReminderRecord } from '../../types/app';
import { isLowStock, STOCK_STATUS, type StockStatus } from '../../utils/inventory';
import {
  buildRefillNotificationContent,
  createNotificationIdentifier,
  REFILL_CHANNEL_ID,
  requestNotificationPermissions,
} from '../notifications';

export interface RefillReminderResult {
  stockStatus: StockStatus;
  notified: boolean;
}

async function cancelExpoNotification(expoNotificationId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(expoNotificationId);
  } catch {
    // Notification may already have fired or been cleared by the OS.
  }
}

export async function cancelRefillReminders(
  db: SQLiteDatabase,
  medicationId: string
): Promise<number> {
  const { reminders } = await deleteNotificationRemindersByMedicationIdAndType(
    db,
    medicationId,
    'refill'
  );

  await Promise.all(reminders.map((r) => cancelExpoNotification(r.expoNotificationId)));

  return reminders.length;
}

export async function sendRefillReminderNotification(
  db: SQLiteDatabase,
  medication: MedicationRecord
): Promise<NotificationReminderRecord | null> {
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

export async function processRefillReminder(
  db: SQLiteDatabase,
  medicationId: string,
  options: { previousCount?: number } = {}
): Promise<RefillReminderResult> {
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

export async function syncAllRefillReminders(db: SQLiteDatabase) {
  const lowStockMedications = await getLowStockMedications(db);
  const results: Array<{ medicationId: string } & RefillReminderResult> = [];

  for (const medication of lowStockMedications) {
    const result = await processRefillReminder(db, medication.id);
    results.push({ medicationId: medication.id, ...result });
  }

  return results;
}
