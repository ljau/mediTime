import type { SQLiteDatabase } from 'expo-sqlite';
import {
  createLog,
  getLogById,
  getLogByScheduleAndTime,
  getLogsForMedicationOnDate,
  updateLogStatus,
} from '../../database/repositories/logs';
import { getScheduleById } from '../../database/repositories/schedules';
import type { DoseActionInput, LogRecord, LogStatus, MarkDoseTakenResult } from '../../types/app';
import { deductForTakenDose } from '../inventory/inventoryService';

export type { DoseActionInput, MarkDoseTakenResult };

async function resolveDoseDetails(
  db: SQLiteDatabase,
  input: DoseActionInput,
  existingLog: LogRecord | null
) {
  if (input.doseAmount !== undefined && input.doseUnit !== undefined) {
    return {
      doseAmount: input.doseAmount,
      doseUnit: input.doseUnit,
    };
  }

  if (existingLog) {
    return {
      doseAmount: input.doseAmount ?? existingLog.doseAmount,
      doseUnit: input.doseUnit ?? existingLog.doseUnit,
    };
  }

  if (input.scheduleId) {
    const schedule = await getScheduleById(db, input.scheduleId);
    if (schedule) {
      return {
        doseAmount: input.doseAmount ?? schedule.doseAmount,
        doseUnit: input.doseUnit ?? schedule.doseUnit,
      };
    }
  }

  return {
    doseAmount: input.doseAmount ?? 1,
    doseUnit: input.doseUnit ?? 'pill',
  };
}

async function findExistingLog(
  db: SQLiteDatabase,
  input: DoseActionInput
): Promise<LogRecord | null> {
  if (input.logId) {
    return getLogById(db, input.logId);
  }

  if (input.scheduleId) {
    return getLogByScheduleAndTime(db, input.scheduleId, input.scheduledAt);
  }

  return null;
}

/**
 * Mark a dose as taken: save log entry and reduce inventory.
 * Idempotent — re-marking an already-taken dose does not deduct again.
 */
export async function markDoseTaken(
  db: SQLiteDatabase,
  input: DoseActionInput
): Promise<MarkDoseTakenResult> {
  let result!: MarkDoseTakenResult;

  await db.withTransactionAsync(async () => {
    const existingLog = await findExistingLog(db, input);

    if (existingLog?.status === 'taken') {
      result = {
        log: existingLog,
        inventoryUpdated: false,
        inventory: null,
      };
      return;
    }

    const { doseAmount, doseUnit } = await resolveDoseDetails(db, input, existingLog);
    const takenAt = new Date().toISOString();

    let log: LogRecord | null;

    if (existingLog) {
      log = await updateLogStatus(db, existingLog.id, {
        status: 'taken',
        takenAt,
        doseAmount,
        doseUnit,
        notes: input.notes,
      });
    } else {
      log = await createLog(db, {
        medicationId: input.medicationId,
        scheduleId: input.scheduleId ?? null,
        userId: input.userId ?? null,
        scheduledAt: input.scheduledAt,
        takenAt,
        status: 'taken',
        doseAmount,
        doseUnit,
        notes: input.notes,
      });
    }

    if (!log) {
      throw new Error('Failed to save taken dose log');
    }

    const inventory = await deductForTakenDose(db, input.medicationId, doseAmount);

    result = {
      log,
      inventoryUpdated: true,
      inventory,
    };
  });

  return result;
}

/**
 * Mark a dose as missed. Does not reduce inventory.
 */
export async function markDoseMissed(
  db: SQLiteDatabase,
  input: DoseActionInput
): Promise<LogRecord> {
  let result!: LogRecord;

  await db.withTransactionAsync(async () => {
    const existingLog = await findExistingLog(db, input);

    if (existingLog?.status === 'taken') {
      throw new Error('Cannot mark a taken dose as missed');
    }

    const { doseAmount, doseUnit } = await resolveDoseDetails(db, input, existingLog);

    if (existingLog) {
      const log = await updateLogStatus(db, existingLog.id, {
        status: 'missed',
        takenAt: null,
        doseAmount,
        doseUnit,
        notes: input.notes,
      });

      if (!log) {
        throw new Error('Failed to update missed dose log');
      }

      result = log;
      return;
    }

    result = await createLog(db, {
      medicationId: input.medicationId,
      scheduleId: input.scheduleId ?? null,
      userId: input.userId ?? null,
      scheduledAt: input.scheduledAt,
      takenAt: null,
      status: 'missed',
      doseAmount,
      doseUnit,
      notes: input.notes,
    });
  });

  return result;
}

/**
 * Mark a dose as skipped. Does not reduce inventory.
 */
export async function markDoseSkipped(
  db: SQLiteDatabase,
  input: DoseActionInput
): Promise<LogRecord> {
  let result!: LogRecord;

  await db.withTransactionAsync(async () => {
    const existingLog = await findExistingLog(db, input);

    if (existingLog?.status === 'taken') {
      throw new Error('Cannot mark a taken dose as skipped');
    }

    const { doseAmount, doseUnit } = await resolveDoseDetails(db, input, existingLog);

    if (existingLog) {
      const log = await updateLogStatus(db, existingLog.id, {
        status: 'skipped',
        takenAt: null,
        doseAmount,
        doseUnit,
        notes: input.notes,
      });

      if (!log) {
        throw new Error('Failed to update skipped dose log');
      }

      result = log;
      return;
    }

    result = await createLog(db, {
      medicationId: input.medicationId,
      scheduleId: input.scheduleId ?? null,
      userId: input.userId ?? null,
      scheduledAt: input.scheduledAt,
      takenAt: null,
      status: 'skipped',
      doseAmount,
      doseUnit,
      notes: input.notes,
    });
  });

  return result;
}

/**
 * Create a pending log for an upcoming dose (no inventory change).
 */
export async function createPendingDoseLog(
  db: SQLiteDatabase,
  input: DoseActionInput
): Promise<LogRecord> {
  const existingLog = await findExistingLog(db, input);
  if (existingLog) {
    return existingLog;
  }

  const { doseAmount, doseUnit } = await resolveDoseDetails(db, input, null);

  return createLog(db, {
    medicationId: input.medicationId,
    scheduleId: input.scheduleId ?? null,
    userId: input.userId ?? null,
    scheduledAt: input.scheduledAt,
    takenAt: null,
    status: 'pending',
    doseAmount,
    doseUnit,
    notes: input.notes,
  });
}

export async function getDosesForDay(
  db: SQLiteDatabase,
  medicationId: string,
  date: string
): Promise<LogRecord[]> {
  return getLogsForMedicationOnDate(db, medicationId, date);
}

type DoseStatusUpdateResult =
  | MarkDoseTakenResult
  | { log: LogRecord; inventoryUpdated: false; inventory: null };

/**
 * Update log status with inventory rules applied.
 * Only 'taken' triggers inventory deduction; missed/skipped/pending do not.
 */
export async function updateDoseStatus(
  db: SQLiteDatabase,
  logId: string,
  status: LogStatus,
  options: { notes?: string | null } = {}
): Promise<DoseStatusUpdateResult> {
  const existingLog = await getLogById(db, logId);
  if (!existingLog) {
    throw new Error('Log entry not found');
  }

  if (status === 'taken') {
    return markDoseTaken(db, {
      medicationId: existingLog.medicationId,
      scheduleId: existingLog.scheduleId,
      scheduledAt: existingLog.scheduledAt,
      userId: existingLog.userId,
      doseAmount: existingLog.doseAmount,
      doseUnit: existingLog.doseUnit,
      notes: options.notes ?? existingLog.notes,
      logId,
    });
  }

  if (status === 'missed') {
    const log = await markDoseMissed(db, {
      medicationId: existingLog.medicationId,
      scheduleId: existingLog.scheduleId,
      scheduledAt: existingLog.scheduledAt,
      userId: existingLog.userId,
      doseAmount: existingLog.doseAmount,
      doseUnit: existingLog.doseUnit,
      notes: options.notes ?? existingLog.notes,
      logId,
    });

    return { log, inventoryUpdated: false, inventory: null };
  }

  if (status === 'skipped') {
    const log = await markDoseSkipped(db, {
      medicationId: existingLog.medicationId,
      scheduleId: existingLog.scheduleId,
      scheduledAt: existingLog.scheduledAt,
      userId: existingLog.userId,
      doseAmount: existingLog.doseAmount,
      doseUnit: existingLog.doseUnit,
      notes: options.notes ?? existingLog.notes,
      logId,
    });

    return { log, inventoryUpdated: false, inventory: null };
  }

  const log = await updateLogStatus(db, logId, {
    status: 'pending',
    takenAt: null,
    doseAmount: existingLog.doseAmount,
    doseUnit: existingLog.doseUnit,
    notes: options.notes ?? existingLog.notes,
  });

  if (!log) {
    throw new Error('Failed to update log status');
  }

  return { log, inventoryUpdated: false, inventory: null };
}
