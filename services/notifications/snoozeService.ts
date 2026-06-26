import * as Notifications from 'expo-notifications';
import type { SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';
import { getMedicationById } from '../../database/repositories/medications';
import { createNotificationReminder } from '../../database/repositories/notification_reminders';
import { buildNotificationContent, createNotificationIdentifier } from './helpers';
import { MEDICATION_CHANNEL_ID, requestNotificationPermissions } from './notificationService';

export interface SnoozeNotificationInput {
  medicationId: string;
  scheduleId: string | null;
  scheduledAt: string;
  snoozedUntil: string;
  doseAmount?: number;
  doseUnit?: string;
}

export async function scheduleSnoozeNotification(
  db: SQLiteDatabase,
  input: SnoozeNotificationInput
): Promise<void> {
  const permissions = await requestNotificationPermissions();
  if (!permissions.granted) return;

  const medication = await getMedicationById(db, input.medicationId);
  if (!medication) return;

  const triggerDate = new Date(input.snoozedUntil);
  if (triggerDate <= new Date()) return;

  const expoNotificationId = createNotificationIdentifier();
  const content = buildNotificationContent(medication, {
    id: input.scheduleId ?? input.medicationId,
    medicationId: input.medicationId,
    doseAmount: input.doseAmount,
    doseUnit: input.doseUnit,
  }, input.scheduledAt.slice(11, 16));

  await Notifications.scheduleNotificationAsync({
    identifier: expoNotificationId,
    content: {
      title: content.title,
      body: content.body,
      data: {
        ...content.data,
        type: 'medication_snooze',
        scheduledAt: input.scheduledAt,
      },
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
      channelId: Platform.OS === 'android' ? MEDICATION_CHANNEL_ID : undefined,
    },
  });

  await createNotificationReminder(db, {
    medicationId: input.medicationId,
    scheduleId: input.scheduleId,
    expoNotificationId,
    reminderTime: input.scheduledAt.slice(11, 16),
    notificationType: 'medication',
  });
}
