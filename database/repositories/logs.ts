import type { SQLiteDatabase } from 'expo-sqlite';
import type { LogInput, LogRecord, LogStatus, HistoryEntry } from '../../types/app';
import { LOG_QUERIES } from '../queries/logs';
import { generateId } from '../utils/ids';

export type { LogInput, LogRecord, LogStatus };

interface LogRow {
  id: string;
  medication_id: string;
  schedule_id: string | null;
  user_id: string | null;
  scheduled_at: string;
  taken_at: string | null;
  status: LogStatus;
  dose_amount: number;
  dose_unit: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  metadata: string;
}

function mapRow(row: LogRow | null): LogRecord | null {
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

export async function getLogById(db: SQLiteDatabase, id: string): Promise<LogRecord | null> {
  const row = await db.getFirstAsync<LogRow>(LOG_QUERIES.SELECT_BY_ID, [id]);
  return mapRow(row);
}

/**
 * Find an existing log for a specific scheduled dose slot.
 */
export async function getLogByScheduleAndTime(
  db: SQLiteDatabase,
  scheduleId: string,
  scheduledAt: string
): Promise<LogRecord | null> {
  const row = await db.getFirstAsync<LogRow>(LOG_QUERIES.SELECT_BY_SCHEDULE_AND_TIME, [
    scheduleId,
    scheduledAt,
  ]);

  return mapRow(row);
}

export async function getLogsByMedicationId(
  db: SQLiteDatabase,
  medicationId: string
): Promise<LogRecord[]> {
  const rows = await db.getAllAsync<LogRow>(LOG_QUERIES.SELECT_BY_MEDICATION, [medicationId]);

  return rows.map((row) => mapRow(row)!);
}

/**
 * All dose events for one calendar day (multiple doses per day supported).
 */
export async function getLogsForMedicationOnDate(
  db: SQLiteDatabase,
  medicationId: string,
  date: string
): Promise<LogRecord[]> {
  const rows = await db.getAllAsync<LogRow>(LOG_QUERIES.SELECT_BY_MEDICATION_DAY, [
    medicationId,
    date,
  ]);

  return rows.map((row) => mapRow(row)!);
}

export async function createLog(db: SQLiteDatabase, data: LogInput): Promise<LogRecord> {
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

interface LogStatusUpdate {
  status: LogStatus;
  takenAt: string | null;
  doseAmount: number;
  doseUnit: string;
  notes?: string | null;
}

export async function updateLogStatus(
  db: SQLiteDatabase,
  id: string,
  data: LogStatusUpdate
): Promise<LogRecord | null> {
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

export async function updateLogMetadata(
  db: SQLiteDatabase,
  id: string,
  metadata: Record<string, unknown>
): Promise<LogRecord | null> {
  const existing = await getLogById(db, id);
  if (!existing) return null;

  const now = new Date().toISOString();

  await db.runAsync(LOG_QUERIES.UPDATE_METADATA, [JSON.stringify(metadata), now, id]);

  return getLogById(db, id);
}

interface HistoryRow {
  id: string;
  medication_id: string;
  schedule_id: string | null;
  scheduled_at: string;
  taken_at: string | null;
  status: LogStatus;
  dose_amount: number;
  dose_unit: string;
  medication_name: string;
  medication_dosage: string | null;
}

export async function getLogsInDateRange(
  db: SQLiteDatabase,
  startDate: string,
  endDate: string,
  medicationId?: string
): Promise<HistoryEntry[]> {
  const rows = medicationId
    ? await db.getAllAsync<HistoryRow>(LOG_QUERIES.SELECT_IN_DATE_RANGE_BY_MEDICATION, [
        startDate,
        endDate,
        medicationId,
      ])
    : await db.getAllAsync<HistoryRow>(LOG_QUERIES.SELECT_IN_DATE_RANGE, [startDate, endDate]);

  return rows.map((row) => ({
    id: row.id,
    medicationId: row.medication_id,
    medicationName: row.medication_name,
    medicationDosage: row.medication_dosage,
    scheduleId: row.schedule_id,
    scheduledAt: row.scheduled_at,
    takenAt: row.taken_at,
    status: row.status,
    doseAmount: row.dose_amount,
    doseUnit: row.dose_unit,
  }));
}

export async function getTodayLogs(db: SQLiteDatabase, date: string): Promise<LogRecord[]> {
  const rows = await db.getAllAsync<LogRow>(LOG_QUERIES.SELECT_TODAY_LOGS, [date]);
  return rows.map((row) => mapRow(row)!);
}

export async function getRecentLogsByMedicationId(
  db: SQLiteDatabase,
  medicationId: string,
  limit: number = 10
): Promise<LogRecord[]> {
  const rows = await db.getAllAsync<LogRow>(
    `SELECT ${LOG_QUERIES.COLUMNS}
     FROM logs
     WHERE medication_id = ?
     ORDER BY scheduled_at DESC
     LIMIT ?`,
    [medicationId, limit]
  );

  return rows.map((row) => mapRow(row)!);
}
