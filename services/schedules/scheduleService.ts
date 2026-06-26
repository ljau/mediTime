import type { SQLiteDatabase } from 'expo-sqlite';
import { getMedicationById } from '../../database/repositories/medications';
import {
  createSchedule,
  deactivateSchedule,
  deleteSchedule,
  getAllSchedulesByMedicationId,
  getScheduleById,
  resumeSchedule,
  updateSchedule,
} from '../../database/repositories/schedules';
import type { ScheduleInput, ScheduleRecord } from '../../types/app';
import {
  cancelScheduleNotifications,
  scheduleMedicationReminders,
} from '../notifications';

export type { ScheduleInput, ScheduleRecord };

async function syncScheduleNotifications(
  db: SQLiteDatabase,
  schedule: ScheduleRecord
): Promise<void> {
  const medication = await getMedicationById(db, schedule.medicationId);
  if (!medication) return;

  if (schedule.isActive) {
    await scheduleMedicationReminders(db, schedule, medication);
  } else {
    await cancelScheduleNotifications(db, schedule.id);
  }
}

export async function getMedicationSchedules(
  db: SQLiteDatabase,
  medicationId: string,
  includeInactive = false
): Promise<ScheduleRecord[]> {
  const rows = await getAllSchedulesByMedicationId(db, medicationId);
  return includeInactive ? rows : rows.filter((s) => s.isActive);
}

export async function saveSchedule(
  db: SQLiteDatabase,
  data: ScheduleInput
): Promise<ScheduleRecord> {
  const schedule = await createSchedule(db, data);
  await syncScheduleNotifications(db, schedule);
  return schedule;
}

export async function editSchedule(
  db: SQLiteDatabase,
  id: string,
  data: Partial<ScheduleInput>
): Promise<ScheduleRecord | null> {
  const schedule = await updateSchedule(db, id, data);
  if (schedule) {
    await syncScheduleNotifications(db, schedule);
  }
  return schedule;
}

export async function pauseSchedule(
  db: SQLiteDatabase,
  id: string
): Promise<ScheduleRecord | null> {
  const paused = await deactivateSchedule(db, id);
  if (!paused) return null;

  await cancelScheduleNotifications(db, id);
  return getScheduleById(db, id);
}

export async function resumeScheduleById(
  db: SQLiteDatabase,
  id: string
): Promise<ScheduleRecord | null> {
  const resumed = await resumeSchedule(db, id);
  if (!resumed) return null;

  const schedule = await getScheduleById(db, id);
  if (schedule) {
    await syncScheduleNotifications(db, schedule);
  }
  return schedule;
}

export async function removeSchedule(db: SQLiteDatabase, id: string): Promise<boolean> {
  await cancelScheduleNotifications(db, id);
  return deleteSchedule(db, id);
}
