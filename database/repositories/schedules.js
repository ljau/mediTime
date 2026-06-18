import { generateId } from '../utils/ids';

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

/**
 * @typedef {Object} ScheduleRecord
 * @property {string} id
 * @property {string} medicationId
 * @property {string|null} userId
 * @property {string|null} label
 * @property {'daily'|'weekly'|'interval'|'as_needed'} frequencyType
 * @property {number} doseAmount
 * @property {string} doseUnit
 * @property {string} reminderTimes
 * @property {number} daysOfWeek
 * @property {number|null} intervalDays
 * @property {string} startDate
 * @property {string|null} endDate
 * @property {string} timezone
 * @property {0|1} isActive
 * @property {string} createdAt
 * @property {string} updatedAt
 * @property {string} metadata
 */

/**
 * @typedef {ScheduleRecord & {
 *   medicationName: string,
 *   medicationDosage: string|null,
 * }} ScheduleWithMedication
 */

/**
 * @typedef {Object} ScheduleInput
 * @property {string} medicationId
 * @property {string|null} [label]
 * @property {'daily'|'weekly'|'interval'|'as_needed'} [frequencyType]
 * @property {number} [doseAmount]
 * @property {string} [doseUnit]
 * @property {string[]} [reminderTimes]
 * @property {number} [daysOfWeek]
 * @property {number|null} [intervalDays]
 * @property {string} [startDate]
 * @property {string|null} [endDate]
 * @property {string} [timezone]
 * @property {0|1} [isActive]
 */

function mapScheduleRow(row) {
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

function mapScheduleWithMedicationRow(row) {
  const schedule = mapScheduleRow(row);
  if (!schedule) return null;

  return {
    ...schedule,
    medicationName: row.medication_name,
    medicationDosage: row.medication_dosage,
  };
}

/**
 * @param {import('expo-sqlite').SQLiteDatabase} db
 * @param {string} id
 * @returns {Promise<ScheduleRecord|null>}
 */
export async function getScheduleById(db, id) {
  const row = await db.getFirstAsync(
    `SELECT ${SCHEDULE_COLUMNS_PLAIN}
     FROM schedules
     WHERE id = ?`,
    [id]
  );

  return mapScheduleRow(row);
}

/**
 * @param {import('expo-sqlite').SQLiteDatabase} db
 * @param {string} medicationId
 * @returns {Promise<ScheduleRecord[]>}
 */
export async function getSchedulesByMedicationId(db, medicationId) {
  const rows = await db.getAllAsync(
    `SELECT ${SCHEDULE_COLUMNS_PLAIN}
     FROM schedules
     WHERE medication_id = ? AND is_active = 1
     ORDER BY created_at ASC`,
    [medicationId]
  );

  return rows.map(mapScheduleRow);
}

/**
 * Active schedules joined with medication details for notification sync.
 * @param {import('expo-sqlite').SQLiteDatabase} db
 * @returns {Promise<ScheduleWithMedication[]>}
 */
export async function getActiveSchedulesWithMedications(db) {
  const rows = await db.getAllAsync(
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

  return rows.map(mapScheduleWithMedicationRow);
}

/**
 * @param {import('expo-sqlite').SQLiteDatabase} db
 * @param {ScheduleInput} data
 * @returns {Promise<ScheduleRecord>}
 */
export async function createSchedule(db, data) {
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

/**
 * @param {import('expo-sqlite').SQLiteDatabase} db
 * @param {string} id
 * @param {Partial<ScheduleInput>} data
 * @returns {Promise<ScheduleRecord|null>}
 */
export async function updateSchedule(db, id, data) {
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

/**
 * @param {import('expo-sqlite').SQLiteDatabase} db
 * @param {string} id
 * @returns {Promise<boolean>}
 */
export async function deactivateSchedule(db, id) {
  const existing = await getScheduleById(db, id);
  if (!existing) return false;

  await db.runAsync(
    `UPDATE schedules SET is_active = 0, updated_at = ? WHERE id = ?`,
    [new Date().toISOString(), id]
  );

  return true;
}
