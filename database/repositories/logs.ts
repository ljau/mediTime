import type { SQLiteDatabase } from 'expo-sqlite';
import type { LogInput, LogRecord, LogStatus } from '../../types/app';
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
