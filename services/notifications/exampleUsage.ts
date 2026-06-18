/**
 * Example usage for MediTime local notifications.
 *
 * Import these patterns when wiring schedules into the UI or medication lifecycle.
 * This file is documentation — it is not imported by the app at runtime.
 */

import type { SQLiteDatabase } from 'expo-sqlite';
import { useDatabase } from '../../context/DatabaseContext';
import { createSchedule, updateSchedule } from '../../database/repositories/schedules';
import { deleteMedication } from '../../database/repositories/medications';
import type { MedicationRecord } from '../../types/app';
import type { ScheduleInput } from '../../types/app';
import {
  cancelMedicationNotifications,
  requestNotificationPermissions,
  scheduleMedicationReminders,
  syncAllMedicationReminders,
  updateScheduleNotifications,
} from './notificationService';

// ---------------------------------------------------------------------------
// 1. Request permissions (also called automatically by the notification service)
// ---------------------------------------------------------------------------
export async function exampleRequestPermissions() {
  const status = await requestNotificationPermissions();

  if (!status.granted) {
    console.warn('Notification permissions were not granted');
    return false;
  }

  return true;
}

// ---------------------------------------------------------------------------
// 2. Schedule daily recurring reminders when creating a schedule
// ---------------------------------------------------------------------------
export async function exampleCreateScheduleWithReminders(
  db: SQLiteDatabase,
  medication: MedicationRecord
) {
  const schedule = await createSchedule(db, {
    medicationId: medication.id,
    label: 'Morning',
    frequencyType: 'daily',
    reminderTimes: ['08:00', '20:00'],
    daysOfWeek: 127, // every day → daily recurring triggers
    doseAmount: 1,
    doseUnit: 'pill',
  });

  const reminders = await scheduleMedicationReminders(db, schedule, {
    id: medication.id,
    name: medication.name,
    dosage: medication.dosage,
  });

  console.log(`Scheduled ${reminders.length} notifications for ${medication.name}`);
  return { schedule, reminders };
}

// ---------------------------------------------------------------------------
// 3. Update notifications when a schedule changes
// ---------------------------------------------------------------------------
export async function exampleUpdateScheduleReminders(
  db: SQLiteDatabase,
  scheduleId: string,
  medication: MedicationRecord
) {
  const updated = await updateSchedule(db, scheduleId, {
    reminderTimes: ['07:30', '19:00'],
    daysOfWeek: 62, // Mon–Fri only → weekly triggers per day
  });

  if (!updated) return null;

  const reminders = await updateScheduleNotifications(db, updated, {
    id: medication.id,
    name: medication.name,
    dosage: medication.dosage,
  });

  console.log(`Rescheduled ${reminders.length} notifications`);
  return reminders;
}

// ---------------------------------------------------------------------------
// 4. Cancel all reminders when a medication is deleted
// ---------------------------------------------------------------------------
export async function exampleDeleteMedicationWithCleanup(
  db: SQLiteDatabase,
  medicationId: string
) {
  await cancelMedicationNotifications(db, medicationId);
  await deleteMedication(db, medicationId);
}

// ---------------------------------------------------------------------------
// 5. Resync all reminders on app launch (after DB is ready)
// ---------------------------------------------------------------------------
export async function exampleSyncOnAppLaunch(db: SQLiteDatabase) {
  const results = await syncAllMedicationReminders(db);
  const total = results.reduce((sum, item) => sum + item.count, 0);
  console.log(`Synced ${total} medication reminders across ${results.length} schedules`);
  return results;
}

// ---------------------------------------------------------------------------
// 6. React hook pattern for a schedule save screen
// ---------------------------------------------------------------------------
export function useScheduleNotificationActions() {
  const { db, isReady } = useDatabase();

  async function saveScheduleWithNotifications(
    medication: MedicationRecord,
    scheduleInput: ScheduleInput,
    existingScheduleId?: string
  ) {
    if (!isReady || !db) return null;

    const granted = await requestNotificationPermissions();
    if (!granted.granted) {
      throw new Error('Enable notifications in Settings to receive medication reminders.');
    }

    const schedule = existingScheduleId
      ? await updateSchedule(db, existingScheduleId, scheduleInput)
      : await createSchedule(db, { ...scheduleInput, medicationId: medication.id });

    if (!schedule) return null;

    await updateScheduleNotifications(db, schedule, {
      id: medication.id,
      name: medication.name,
      dosage: medication.dosage,
    });

    return schedule;
  }

  return { saveScheduleWithNotifications };
}
