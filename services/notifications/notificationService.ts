import type { EventSubscription } from 'expo-modules-core';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import type { SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';
import i18n from '../../i18n';
import {
  createNotificationReminder,
  deleteNotificationRemindersByMedicationId,
  deleteNotificationRemindersByScheduleId,
  getNotificationRemindersByMedicationId,
  getNotificationRemindersByScheduleId,
} from '../../database/repositories/notification_reminders';
import {
  getActiveSchedulesWithMedications,
  type ScheduleRecord,
} from '../../database/repositories/schedules';
import type { MedicationRecord, NotificationReminderRecord } from '../../types/app';
import {
  buildNotificationContent,
  createNotificationIdentifier,
  getTriggerWeekdayTargets,
  isScheduleEligibleForReminders,
  parseReminderTimes,
  parseTimeString,
} from './helpers';
import { getUpcomingIntervalDates } from '../../utils/schedules';

export const MEDICATION_CHANNEL_ID = 'medication-reminders';
export const REFILL_CHANNEL_ID = 'refill-reminders';
export const EXPIRATION_CHANNEL_ID = 'expiration-reminders';

let isConfigured = false;

export async function configureNotifications(): Promise<void> {
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
      name: i18n.t('notifications.channelMedication'),
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0F766E',
    });

    await Notifications.setNotificationChannelAsync(REFILL_CHANNEL_ID, {
      name: i18n.t('notifications.channelRefill'),
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#D97706',
    });

    await Notifications.setNotificationChannelAsync(EXPIRATION_CHANNEL_ID, {
      name: i18n.t('notifications.channelExpiration'),
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#DC2626',
    });
  }

  isConfigured = true;
}

export async function requestNotificationPermissions(): Promise<Notifications.NotificationPermissionsStatus> {
  await configureNotifications();

  if (!Device.isDevice) {
    return {
      status: Notifications.PermissionStatus.UNDETERMINED,
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

async function cancelExpoNotification(expoNotificationId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(expoNotificationId);
  } catch {
    // Notification may already have fired or been cleared by the OS.
  }
}

export async function cancelScheduleNotifications(
  db: SQLiteDatabase,
  scheduleId: string
): Promise<number> {
  const reminders = await getNotificationRemindersByScheduleId(db, scheduleId);

  await Promise.all(reminders.map((r) => cancelExpoNotification(r.expoNotificationId)));
  await deleteNotificationRemindersByScheduleId(db, scheduleId);

  return reminders.length;
}

export async function cancelMedicationNotifications(
  db: SQLiteDatabase,
  medicationId: string
): Promise<number> {
  const reminders = await getNotificationRemindersByMedicationId(db, medicationId);

  await Promise.all(reminders.map((r) => cancelExpoNotification(r.expoNotificationId)));
  await deleteNotificationRemindersByMedicationId(db, medicationId);

  return reminders.length;
}

type MedicationNotificationInfo = Pick<MedicationRecord, 'id' | 'name' | 'dosage'>;

export async function scheduleMedicationReminders(
  db: SQLiteDatabase,
  schedule: ScheduleRecord,
  medication: MedicationNotificationInfo
): Promise<NotificationReminderRecord[]> {
  await cancelScheduleNotifications(db, schedule.id);

  if (!isScheduleEligibleForReminders(schedule)) {
    return [];
  }

  const permissions = await requestNotificationPermissions();
  if (!permissions.granted) {
    return [];
  }

  const reminderTimes = parseReminderTimes(schedule.reminderTimes);
  const created: NotificationReminderRecord[] = [];

  if (schedule.frequencyType === 'interval') {
    const today = new Date().toISOString().slice(0, 10);
    const upcomingDates = getUpcomingIntervalDates(schedule, today, 14);

    for (const date of upcomingDates) {
      for (const timeString of reminderTimes) {
        const time = parseTimeString(timeString);
        if (!time) continue;

        const triggerDate = new Date(
          `${date}T${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}:00`
        );
        if (triggerDate <= new Date()) continue;

        const expoNotificationId = createNotificationIdentifier();
        const content = buildNotificationContent(medication, schedule, timeString);

        await Notifications.scheduleNotificationAsync({
          identifier: expoNotificationId,
          content: {
            title: content.title,
            body: content.body,
            data: { ...content.data, scheduledDate: date },
            sound: true,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: triggerDate,
            channelId: Platform.OS === 'android' ? MEDICATION_CHANNEL_ID : undefined,
          },
        });

        const record = await createNotificationReminder(db, {
          medicationId: schedule.medicationId,
          scheduleId: schedule.id,
          expoNotificationId,
          reminderTime: timeString,
          weekday: null,
          notificationType: 'medication',
        });

        created.push(record);
      }
    }

    return created;
  }

  const weekdayTargets = getTriggerWeekdayTargets(schedule);

  for (const timeString of reminderTimes) {
    const time = parseTimeString(timeString);
    if (!time) continue;

    for (const { weekday } of weekdayTargets) {
      const expoNotificationId = createNotificationIdentifier();
      const content = buildNotificationContent(medication, schedule, timeString);

      const trigger: Notifications.NotificationTriggerInput =
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

export async function updateScheduleNotifications(
  db: SQLiteDatabase,
  schedule: ScheduleRecord,
  medication: MedicationNotificationInfo
): Promise<NotificationReminderRecord[]> {
  return scheduleMedicationReminders(db, schedule, medication);
}

export async function syncAllMedicationReminders(db: SQLiteDatabase) {
  const schedules = await getActiveSchedulesWithMedications(db);
  const results: Array<{ scheduleId: string; count: number }> = [];

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

export function addNotificationResponseListener(
  handler: (response: Notifications.NotificationResponse) => void
): EventSubscription {
  return Notifications.addNotificationResponseReceivedListener(handler);
}
