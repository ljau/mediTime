import type { SQLiteDatabase } from 'expo-sqlite';
import type {
  ScheduleInput,
  ScheduleRecord,
  ScheduleWithMedication,
} from '../../types/app';
import { generateId } from '../utils/ids';

export type { ScheduleInput, ScheduleRecord, ScheduleWithMedication };

const SCHEDULE_COLUMNS_PLAIN = `
  id,
  medication_id,
  user_id,
  label,
  frequency_type,
  dose_amount,
  dose_unit,
  reminder_times,
  days_of_week,
  interval_days,
  start_date,
  end_date,
  timezone,
  is_active,
  created_at,
  updated_at,
  metadata
`;

const SCHEDULE_COLUMNS = `
  s.id,
  s.medication_id,
  s.user_id,
  s.label,
  s.frequency_type,
  s.dose_amount,
  s.dose_unit,
  s.reminder_times,
  s.days_of_week,
  s.interval_days,
  s.start_date,
  s.end_date,
  s.timezone,
  s.is_active,
  s.created_at,
  s.updated_at,
  s.metadata
`;

interface ScheduleRow {
  id: string;
  medication_id: string;
  user_id: string | null;
  label: string | null;
  frequency_type: ScheduleRecord['frequencyType'];
  dose_amount: number;
  dose_unit: string;
  reminder_times: string;
  days_of_week: number;
  interval_days: number | null;
  start_date: string;
  end_date: string | null;
  timezone: string;
  is_active: 0 | 1;
  created_at: string;
  updated_at: string;
  metadata: string;
}

interface ScheduleWithMedicationRow extends ScheduleRow {
  medication_name: string;
  medication_dosage: string | null;
}

function mapScheduleRow(row: ScheduleRow | null): ScheduleRecord | null {
  if (!row) return null;

  return {
    id: row.id,
    medicationId: row.medication_id,
    userId: row.user_id,
    label: row.label,
    frequencyType: row.frequency_type,
    doseAmount: row.dose_amount,
    doseUnit: row.dose_unit,
    reminderTimes: row.reminder_times,
    daysOfWeek: row.days_of_week,
    intervalDays: row.interval_days,
    startDate: row.start_date,
    endDate: row.end_date,
    timezone: row.timezone,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    metadata: row.metadata,
  };
}

function mapScheduleWithMedicationRow(
  row: ScheduleWithMedicationRow | null
): ScheduleWithMedication | null {
  const schedule = mapScheduleRow(row);
  if (!schedule || !row) return null;

  return {
    ...schedule,
    medicationName: row.medication_name,
    medicationDosage: row.medication_dosage,
  };
}

export async function getScheduleById(
  db: SQLiteDatabase,
  id: string
): Promise<ScheduleRecord | null> {
  const row = await db.getFirstAsync<ScheduleRow>(
    `SELECT ${SCHEDULE_COLUMNS_PLAIN}
     FROM schedules
     WHERE id = ?`,
    [id]
  );

  return mapScheduleRow(row);
}

export async function getSchedulesByMedicationId(
  db: SQLiteDatabase,
  medicationId: string
): Promise<ScheduleRecord[]> {
  const rows = await db.getAllAsync<ScheduleRow>(
    `SELECT ${SCHEDULE_COLUMNS_PLAIN}
     FROM schedules
     WHERE medication_id = ? AND is_active = 1
     ORDER BY created_at ASC`,
    [medicationId]
  );

  return rows.map((row) => mapScheduleRow(row)!);
}

/**
 * Active schedules joined with medication details for notification sync.
 */
export async function getActiveSchedulesWithMedications(
  db: SQLiteDatabase
): Promise<ScheduleWithMedication[]> {
  const rows = await db.getAllAsync<ScheduleWithMedicationRow>(
    `SELECT ${SCHEDULE_COLUMNS},
            m.name AS medication_name,
            m.dosage AS medication_dosage
     FROM schedules s
     JOIN medications m ON m.id = s.medication_id
     WHERE s.is_active = 1
       AND m.deleted_at IS NULL
       AND m.is_active = 1
     ORDER BY m.name COLLATE NOCASE ASC, s.created_at ASC`
  );

  return rows.map((row) => mapScheduleWithMedicationRow(row)!);
}

export async function createSchedule(
  db: SQLiteDatabase,
  data: ScheduleInput
): Promise<ScheduleRecord> {
  const id = generateId();
  const now = new Date().toISOString();
  const today = now.slice(0, 10);
  const reminderTimes = JSON.stringify(data.reminderTimes ?? []);

  await db.runAsync(
    `INSERT INTO schedules (
      id,
      medication_id,
      label,
      frequency_type,
      dose_amount,
      dose_unit,
      reminder_times,
      days_of_week,
      interval_days,
      start_date,
      end_date,
      timezone,
      is_active,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.medicationId,
      data.label?.trim() || null,
      data.frequencyType ?? 'daily',
      data.doseAmount ?? 1,
      data.doseUnit ?? 'pill',
      reminderTimes,
      data.daysOfWeek ?? 127,
      data.intervalDays ?? null,
      data.startDate ?? today,
      data.endDate ?? null,
      data.timezone ?? 'UTC',
      data.isActive ?? 1,
      now,
      now,
    ]
  );

  const schedule = await getScheduleById(db, id);
  if (!schedule) {
    throw new Error('Failed to create schedule');
  }

  return schedule;
}

export async function updateSchedule(
  db: SQLiteDatabase,
  id: string,
  data: Partial<ScheduleInput>
): Promise<ScheduleRecord | null> {
  const existing = await getScheduleById(db, id);
  if (!existing) return null;

  const now = new Date().toISOString();
  const reminderTimes =
    data.reminderTimes !== undefined
      ? JSON.stringify(data.reminderTimes)
      : existing.reminderTimes;

  await db.runAsync(
    `UPDATE schedules
     SET label = ?,
         frequency_type = ?,
         dose_amount = ?,
         dose_unit = ?,
         reminder_times = ?,
         days_of_week = ?,
         interval_days = ?,
         start_date = ?,
         end_date = ?,
         timezone = ?,
         is_active = ?,
         updated_at = ?
     WHERE id = ?`,
    [
      data.label !== undefined ? data.label?.trim() || null : existing.label,
      data.frequencyType ?? existing.frequencyType,
      data.doseAmount ?? existing.doseAmount,
      data.doseUnit ?? existing.doseUnit,
      reminderTimes,
      data.daysOfWeek ?? existing.daysOfWeek,
      data.intervalDays !== undefined ? data.intervalDays : existing.intervalDays,
      data.startDate ?? existing.startDate,
      data.endDate !== undefined ? data.endDate : existing.endDate,
      data.timezone ?? existing.timezone,
      data.isActive ?? existing.isActive,
      now,
      id,
    ]
  );

  return getScheduleById(db, id);
}

export async function deactivateSchedule(db: SQLiteDatabase, id: string): Promise<boolean> {
  const existing = await getScheduleById(db, id);
  if (!existing) return false;

  await db.runAsync(`UPDATE schedules SET is_active = 0, updated_at = ? WHERE id = ?`, [
    new Date().toISOString(),
    id,
  ]);

  return true;
}
