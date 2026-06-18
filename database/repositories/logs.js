import { LOG_QUERIES } from '../queries/logs';
import { generateId } from '../utils/ids';

/**
 * @typedef {'taken'|'missed'|'skipped'|'pending'} LogStatus
 */

/**
 * @typedef {Object} LogRecord
 * @property {string} id
 * @property {string} medicationId
 * @property {string|null} scheduleId
 * @property {string|null} userId
 * @property {string} scheduledAt
 * @property {string|null} takenAt
 * @property {LogStatus} status
 * @property {number} doseAmount
 * @property {string} doseUnit
 * @property {string|null} notes
 * @property {string} createdAt
 * @property {string} updatedAt
 * @property {string} metadata
 */

/**
 * @typedef {Object} LogInput
 * @property {string} medicationId
 * @property {string|null} [scheduleId]
 * @property {string|null} [userId]
 * @property {string} scheduledAt
 * @property {string|null} [takenAt]
 * @property {LogStatus} [status]
 * @property {number} [doseAmount]
 * @property {string} [doseUnit]
 * @property {string|null} [notes]
 */

function mapRow(row) {
  if (!row) return null;

  return {
    id: row.id,
    medicationId: row.medication_id,
    scheduleId: row.schedule_id,
    userId: row.user_id,
    scheduledAt: row.scheduled_at,
    takenAt: row.taken_at,
    status: row.status,
    doseAmount: row.dose_amount,
    doseUnit: row.dose_unit,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    metadata: row.metadata,
  };
}

/**
 * @param {import('expo-sqlite').SQLiteDatabase} db
 * @param {string} id
 * @returns {Promise<LogRecord|null>}
 */
export async function getLogById(db, id) {
  const row = await db.getFirstAsync(LOG_QUERIES.SELECT_BY_ID, [id]);
  return mapRow(row);
}

/**
 * Find an existing log for a specific scheduled dose slot.
 * @param {import('expo-sqlite').SQLiteDatabase} db
 * @param {string} scheduleId
 * @param {string} scheduledAt
 * @returns {Promise<LogRecord|null>}
 */
export async function getLogByScheduleAndTime(db, scheduleId, scheduledAt) {
  const row = await db.getFirstAsync(LOG_QUERIES.SELECT_BY_SCHEDULE_AND_TIME, [
    scheduleId,
    scheduledAt,
  ]);

  return mapRow(row);
}

/**
 * @param {import('expo-sqlite').SQLiteDatabase} db
 * @param {string} medicationId
 * @returns {Promise<LogRecord[]>}
 */
export async function getLogsByMedicationId(db, medicationId) {
  const rows = await db.getAllAsync(LOG_QUERIES.SELECT_BY_MEDICATION, [
    medicationId,
  ]);

  return rows.map(mapRow);
}

/**
 * All dose events for one calendar day (multiple doses per day supported).
 * @param {import('expo-sqlite').SQLiteDatabase} db
 * @param {string} medicationId
 * @param {string} date YYYY-MM-DD
 * @returns {Promise<LogRecord[]>}
 */
export async function getLogsForMedicationOnDate(db, medicationId, date) {
  const rows = await db.getAllAsync(LOG_QUERIES.SELECT_BY_MEDICATION_DAY, [
    medicationId,
    date,
  ]);

  return rows.map(mapRow);
}

/**
 * @param {import('expo-sqlite').SQLiteDatabase} db
 * @param {LogInput} data
 * @returns {Promise<LogRecord>}
 */
export async function createLog(db, data) {
  const id = generateId();
  const now = new Date().toISOString();

  await db.runAsync(LOG_QUERIES.INSERT, [
    id,
    data.medicationId,
    data.scheduleId ?? null,
    data.userId ?? null,
    data.scheduledAt,
    data.takenAt ?? null,
    data.status ?? 'pending',
    data.doseAmount ?? 1,
    data.doseUnit ?? 'pill',
    data.notes?.trim() || null,
    now,
    now,
  ]);

  const log = await getLogById(db, id);
  if (!log) {
    throw new Error('Failed to create log entry');
  }

  return log;
}

/**
 * @param {import('expo-sqlite').SQLiteDatabase} db
 * @param {string} id
 * @param {Object} data
 * @param {LogStatus} data.status
 * @param {string|null} data.takenAt
 * @param {number} data.doseAmount
 * @param {string} data.doseUnit
 * @param {string|null} [data.notes]
 * @returns {Promise<LogRecord|null>}
 */
export async function updateLogStatus(db, id, data) {
  const existing = await getLogById(db, id);
  if (!existing) return null;

  const now = new Date().toISOString();

  await db.runAsync(LOG_QUERIES.UPDATE_STATUS, [
    data.status,
    data.takenAt,
    data.doseAmount,
    data.doseUnit,
    data.notes !== undefined ? data.notes?.trim() || null : existing.notes,
    now,
    id,
  ]);

  return getLogById(db, id);
}
