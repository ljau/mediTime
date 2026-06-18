/**
 * Example usage for MediTime local notifications.
 *
 * Import these patterns when wiring schedules into the UI or medication lifecycle.
 * This file is documentation — it is not imported by the app at runtime.
 */

import { useDatabase } from '../../context/DatabaseContext';
import { createSchedule, updateSchedule } from '../../database/repositories/schedules';
import { deleteMedication } from '../../database/repositories/medications';
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
export async function exampleCreateScheduleWithReminders(db, medication) {
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
export async function exampleUpdateScheduleReminders(db, scheduleId, medication) {
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
export async function exampleDeleteMedicationWithCleanup(db, medicationId) {
  await cancelMedicationNotifications(db, medicationId);
  await deleteMedication(db, medicationId);
}

// ---------------------------------------------------------------------------
// 5. Resync all reminders on app launch (after DB is ready)
// ---------------------------------------------------------------------------
export async function exampleSyncOnAppLaunch(db) {
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

  async function saveScheduleWithNotifications(medication, scheduleInput, existingScheduleId) {
    if (!isReady || !db) return null;

    const granted = await requestNotificationPermissions();
    if (!granted.granted) {
      throw new Error('Enable notifications in Settings to receive medication reminders.');
    }

    const schedule = existingScheduleId
      ? await updateSchedule(db, existingScheduleId, scheduleInput)
      : await createSchedule(db, { medicationId: medication.id, ...scheduleInput });

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
