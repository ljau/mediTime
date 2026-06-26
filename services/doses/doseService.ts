import type { SQLiteDatabase } from 'expo-sqlite';
import {
  createLog,
  getLogByScheduleAndTime,
  getTodayLogs,
  updateLogMetadata,
} from '../../database/repositories/logs';
import { getActiveSchedulesWithMedications } from '../../database/repositories/schedules';
import type { DoseActionInput, LogRecord, ScheduledDose, TodayDose } from '../../types/app';
import {
  addDaysToIsoDate,
  getSnoozedUntil,
  isReminderWindowExpired,
  isSnoozeActive,
  SNOOZE_DURATION_MS,
} from '../../utils/logs';
import { getTodayIsoDate } from '../../utils/inventory';
import { getScheduledDosesForDate } from '../../utils/schedules';
import {
  markDoseMissed,
  markDoseSkipped,
  markDoseTaken,
} from '../logs/logService';
import { scheduleSnoozeNotification } from '../notifications/snoozeService';
import { checkRefillReminder } from '../inventory/inventoryService';

export type { TodayDose };

function resolveDoseStatus(
  log: LogRecord | null,
  scheduledAt: string
): TodayDose['status'] {
  if (!log) {
    if (isReminderWindowExpired(scheduledAt)) return 'missed';
    return 'pending';
  }

  if (log.status === 'taken' || log.status === 'skipped' || log.status === 'missed') {
    return log.status;
  }

  if (isSnoozeActive(log)) return 'snoozed';

  if (isReminderWindowExpired(scheduledAt)) return 'missed';

  return log.status;
}

function mergeTodayDoses(
  scheduledDoses: ScheduledDose[],
  logs: LogRecord[]
): TodayDose[] {
  const logByKey = new Map(
    logs
      .filter((log) => log.scheduleId)
      .map((log) => [`${log.scheduleId}:${log.scheduledAt}`, log])
  );

  return scheduledDoses.map((dose) => {
    const log = logByKey.get(`${dose.scheduleId}:${dose.scheduledAt}`) ?? null;
    const status = resolveDoseStatus(log, dose.scheduledAt);

    return {
      ...dose,
      logId: log?.id ?? null,
      status,
      takenAt: log?.takenAt ?? null,
      snoozedUntil: log ? getSnoozedUntil(log) : null,
    };
  });
}

/**
 * Mark overdue pending doses as missed in the database.
 */
export async function processMissedDoses(db: SQLiteDatabase, date?: string): Promise<number> {
  const today = date ?? getTodayIsoDate();
  const doses = await getTodayDosesWithStatus(db, today);
  let marked = 0;

  for (const dose of doses) {
    if (dose.status !== 'missed') continue;
    if (dose.logId) {
      const existing = await getLogByScheduleAndTime(db, dose.scheduleId, dose.scheduledAt);
      if (existing && (existing.status === 'taken' || existing.status === 'skipped')) continue;
      if (existing?.status === 'missed') continue;
    }

    await markDoseMissed(db, {
      medicationId: dose.medicationId,
      scheduleId: dose.scheduleId,
      scheduledAt: dose.scheduledAt,
      logId: dose.logId ?? undefined,
      doseAmount: dose.doseAmount,
      doseUnit: dose.doseUnit,
    });
    marked += 1;
  }

  return marked;
}

export async function getTodayDosesWithStatus(
  db: SQLiteDatabase,
  date?: string
): Promise<TodayDose[]> {
  const today = date ?? getTodayIsoDate();
  const schedules = await getActiveSchedulesWithMedications(db);
  const scheduledDoses = getScheduledDosesForDate(schedules, today);
  const logs = await getTodayLogs(db, today);

  return mergeTodayDoses(scheduledDoses, logs);
}

export async function getMedicationTodayDoses(
  db: SQLiteDatabase,
  medicationId: string,
  date?: string
): Promise<TodayDose[]> {
  const today = date ?? getTodayIsoDate();
  const allDoses = await getTodayDosesWithStatus(db, today);
  return allDoses.filter((dose) => dose.medicationId === medicationId);
}

export async function takeDose(
  db: SQLiteDatabase,
  input: DoseActionInput
): Promise<Awaited<ReturnType<typeof markDoseTaken>>> {
  const result = await markDoseTaken(db, input);

  if (result.inventoryUpdated && result.inventory) {
    await checkRefillReminder(db, input.medicationId, {
      previousCount: result.inventory.previousCount,
    });
  }

  return result;
}

export async function skipDose(
  db: SQLiteDatabase,
  input: DoseActionInput
): Promise<LogRecord> {
  return markDoseSkipped(db, input);
}

export async function snoozeDose(
  db: SQLiteDatabase,
  input: DoseActionInput
): Promise<LogRecord> {
  const snoozedUntil = new Date(Date.now() + SNOOZE_DURATION_MS).toISOString();
  let log: LogRecord;

  if (input.logId) {
    const existing = await updateLogMetadata(db, input.logId, { snoozedUntil });
    if (!existing) throw new Error('Log entry not found');
    log = existing;
  } else {
    log = await createLog(db, {
      medicationId: input.medicationId,
      scheduleId: input.scheduleId ?? null,
      userId: input.userId ?? null,
      scheduledAt: input.scheduledAt,
      status: 'pending',
      doseAmount: input.doseAmount,
      doseUnit: input.doseUnit,
      notes: input.notes,
    });
    log = (await updateLogMetadata(db, log.id, { snoozedUntil })) ?? log;
  }

  await scheduleSnoozeNotification(db, {
    medicationId: input.medicationId,
    scheduleId: input.scheduleId ?? null,
    scheduledAt: input.scheduledAt,
    snoozedUntil,
    doseAmount: input.doseAmount,
    doseUnit: input.doseUnit,
  });

  return log;
}

export function getHistoryDateRange(filter: 'today' | '7days' | '30days'): {
  startDate: string;
  endDate: string;
} {
  const endDate = getTodayIsoDate();
  const daysBack = filter === 'today' ? 0 : filter === '7days' ? 6 : 29;
  const startDate = addDaysToIsoDate(endDate, -daysBack);

  return { startDate, endDate };
}
