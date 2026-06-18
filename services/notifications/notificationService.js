import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import {
  createNotificationReminder,
  deleteNotificationRemindersByMedicationId,
  deleteNotificationRemindersByScheduleId,
  getNotificationRemindersByMedicationId,
  getNotificationRemindersByScheduleId,
} from '../../database/repositories/notification_reminders';
import { getActiveSchedulesWithMedications } from '../../database/repositories/schedules';
import {
  buildNotificationContent,
  createNotificationIdentifier,
  getTriggerWeekdayTargets,
  isScheduleEligibleForReminders,
  parseReminderTimes,
  parseTimeString,
} from './helpers';

export const MEDICATION_CHANNEL_ID = 'medication-reminders';
export const REFILL_CHANNEL_ID = 'refill-reminders';
export const EXPIRATION_CHANNEL_ID = 'expiration-reminders';

let isConfigured = false;

/**
 * Configure foreground presentation and Android notification channel.
 */
export async function configureNotifications() {
  if (isConfigured) return;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(MEDICATION_CHANNEL_ID, {
      name: 'Medication reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0F766E',
    });

    await Notifications.setNotificationChannelAsync(REFILL_CHANNEL_ID, {
      name: 'Refill reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#D97706',
    });

    await Notifications.setNotificationChannelAsync(EXPIRATION_CHANNEL_ID, {
      name: 'Expiration reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#DC2626',
    });
  }

  isConfigured = true;
}

/**
 * Request notification permissions from the user.
 * @returns {Promise<import('expo-notifications').NotificationPermissionsStatus>}
 */
export async function requestNotificationPermissions() {
  await configureNotifications();

  if (!Device.isDevice) {
    return {
      status: 'undetermined',
      granted: false,
      canAskAgain: false,
      expires: 'never',
    };
  }

  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) {
    return existing;
  }

  return Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: false,
      allowSound: true,
    },
  });
}

/**
 * @param {import('expo-sqlite').SQLiteDatabase} db
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
 * Cancel all stored reminders for a schedule and remove DB rows.
 * @param {import('expo-sqlite').SQLiteDatabase} db
 * @param {string} scheduleId
 */
export async function cancelScheduleNotifications(db, scheduleId) {
  const reminders = await getNotificationRemindersByScheduleId(db, scheduleId);

  await Promise.all(reminders.map((r) => cancelExpoNotification(r.expoNotificationId)));
  await deleteNotificationRemindersByScheduleId(db, scheduleId);

  return reminders.length;
}

/**
 * Cancel all stored reminders for a medication and remove DB rows.
 * @param {import('expo-sqlite').SQLiteDatabase} db
 * @param {string} medicationId
 */
export async function cancelMedicationNotifications(db, medicationId) {
  const reminders = await getNotificationRemindersByMedicationId(db, medicationId);

  await Promise.all(reminders.map((r) => cancelExpoNotification(r.expoNotificationId)));
  await deleteNotificationRemindersByMedicationId(db, medicationId);

  return reminders.length;
}

/**
 * Schedule recurring local notifications for a medication schedule.
 * Replaces any existing notifications for the same schedule.
 *
 * @param {import('expo-sqlite').SQLiteDatabase} db
 * @param {import('../../database/repositories/schedules').ScheduleRecord} schedule
 * @param {{ id: string, name: string, dosage?: string|null }} medication
 * @returns {Promise<import('../../database/repositories/notification_reminders').NotificationReminderRecord[]>}
 */
export async function scheduleMedicationReminders(db, schedule, medication) {
  await cancelScheduleNotifications(db, schedule.id);

  if (!isScheduleEligibleForReminders(schedule)) {
    return [];
  }

  const permissions = await requestNotificationPermissions();
  if (!permissions.granted) {
    return [];
  }

  const reminderTimes = parseReminderTimes(schedule.reminderTimes);
  const weekdayTargets = getTriggerWeekdayTargets(schedule);
  const created = [];

  for (const timeString of reminderTimes) {
    const time = parseTimeString(timeString);
    if (!time) continue;

    for (const { weekday } of weekdayTargets) {
      const expoNotificationId = createNotificationIdentifier();
      const content = buildNotificationContent(medication, schedule, timeString);

      const trigger =
        weekday === null
          ? {
              type: Notifications.SchedulableTriggerInputTypes.DAILY,
              hour: time.hour,
              minute: time.minute,
              channelId: Platform.OS === 'android' ? MEDICATION_CHANNEL_ID : undefined,
            }
          : {
              type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
              weekday,
              hour: time.hour,
              minute: time.minute,
              channelId: Platform.OS === 'android' ? MEDICATION_CHANNEL_ID : undefined,
            };

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

      const record = await createNotificationReminder(db, {
        medicationId: schedule.medicationId,
        scheduleId: schedule.id,
        expoNotificationId,
        reminderTime: timeString,
        weekday,
        notificationType: 'medication',
      });

      created.push(record);
    }
  }

  return created;
}

/**
 * Reschedule notifications after a schedule or medication change.
 * @param {import('expo-sqlite').SQLiteDatabase} db
 * @param {import('../../database/repositories/schedules').ScheduleRecord} schedule
 * @param {{ id: string, name: string, dosage?: string|null }} medication
 */
export async function updateScheduleNotifications(db, schedule, medication) {
  return scheduleMedicationReminders(db, schedule, medication);
}

/**
 * Rebuild all active medication reminders from the database.
 * Useful on app launch after OS clears scheduled notifications.
 * @param {import('expo-sqlite').SQLiteDatabase} db
 */
export async function syncAllMedicationReminders(db) {
  const schedules = await getActiveSchedulesWithMedications(db);
  const results = [];

  for (const schedule of schedules) {
    const reminders = await scheduleMedicationReminders(db, schedule, {
      id: schedule.medicationId,
      name: schedule.medicationName,
      dosage: schedule.medicationDosage,
    });
    results.push({ scheduleId: schedule.id, count: reminders.length });
  }

  return results;
}

/**
 * Register a listener for notification taps (e.g. navigate to medication detail).
 * @param {(response: import('expo-notifications').NotificationResponse) => void} handler
 * @returns {import('expo-modules-core').EventSubscription}
 */
export function addNotificationResponseListener(handler) {
  return Notifications.addNotificationResponseReceivedListener(handler);
}
