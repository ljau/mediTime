import {
  createLog,
  getLogById,
  getLogByScheduleAndTime,
  getLogsForMedicationOnDate,
  updateLogStatus,
} from '../../database/repositories/logs';
import { getScheduleById } from '../../database/repositories/schedules';
import { deductForTakenDose } from '../inventory/inventoryService';

/**
 * @typedef {import('../../database/repositories/logs').LogRecord} LogRecord
 * @typedef {import('../../database/repositories/logs').LogStatus} LogStatus
 */

/**
 * @typedef {Object} DoseActionInput
 * @property {string} medicationId
 * @property {string|null} [scheduleId]
 * @property {string} scheduledAt ISO 8601 timestamp for this dose slot
 * @property {string|null} [userId]
 * @property {number} [doseAmount]
 * @property {string} [doseUnit]
 * @property {string|null} [notes]
 * @property {string} [logId] Existing log to update instead of creating
 */

/**
 * @typedef {Object} MarkDoseTakenResult
 * @property {LogRecord} log
 * @property {boolean} inventoryUpdated
 * @property {import('../../database/repositories/inventory').InventoryReductionResult|null} inventory
 */

/**
 * Resolve dose amount/unit from input, schedule, or existing log.
 * @param {import('expo-sqlite').SQLiteDatabase} db
 * @param {DoseActionInput} input
 * @param {LogRecord|null} existingLog
 */
async function resolveDoseDetails(db, input, existingLog) {
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

/**
 * Find an existing log for this dose slot.
 * @param {import('expo-sqlite').SQLiteDatabase} db
 * @param {DoseActionInput} input
 * @returns {Promise<LogRecord|null>}
 */
async function findExistingLog(db, input) {
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
 * @param {import('expo-sqlite').SQLiteDatabase} db
 * @param {DoseActionInput} input
 * @returns {Promise<MarkDoseTakenResult>}
 */
export async function markDoseTaken(db, input) {
  return db.withTransactionAsync(async () => {
    const existingLog = await findExistingLog(db, input);

    if (existingLog?.status === 'taken') {
      return {
        log: existingLog,
        inventoryUpdated: false,
        inventory: null,
      };
    }

    const { doseAmount, doseUnit } = await resolveDoseDetails(
      db,
      input,
      existingLog
    );
    const takenAt = new Date().toISOString();

    let log;

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

    const inventory = await deductForTakenDose(
      db,
      input.medicationId,
      doseAmount
    );

    return {
      log,
      inventoryUpdated: true,
      inventory,
    };
  });
}

/**
 * Mark a dose as missed. Does not reduce inventory.
 * @param {import('expo-sqlite').SQLiteDatabase} db
 * @param {DoseActionInput} input
 * @returns {Promise<LogRecord>}
 */
export async function markDoseMissed(db, input) {
  return db.withTransactionAsync(async () => {
    const existingLog = await findExistingLog(db, input);

    if (existingLog?.status === 'taken') {
      throw new Error('Cannot mark a taken dose as missed');
    }

    const { doseAmount, doseUnit } = await resolveDoseDetails(
      db,
      input,
      existingLog
    );

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

      return log;
    }

    return createLog(db, {
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
}

/**
 * Mark a dose as skipped. Does not reduce inventory.
 * @param {import('expo-sqlite').SQLiteDatabase} db
 * @param {DoseActionInput} input
 * @returns {Promise<LogRecord>}
 */
export async function markDoseSkipped(db, input) {
  return db.withTransactionAsync(async () => {
    const existingLog = await findExistingLog(db, input);

    if (existingLog?.status === 'taken') {
      throw new Error('Cannot mark a taken dose as skipped');
    }

    const { doseAmount, doseUnit } = await resolveDoseDetails(
      db,
      input,
      existingLog
    );

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

      return log;
    }

    return createLog(db, {
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
}

/**
 * Create a pending log for an upcoming dose (no inventory change).
 * @param {import('expo-sqlite').SQLiteDatabase} db
 * @param {DoseActionInput} input
 * @returns {Promise<LogRecord>}
 */
export async function createPendingDoseLog(db, input) {
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

/**
 * Get all dose logs for a medication on a given day.
 * @param {import('expo-sqlite').SQLiteDatabase} db
 * @param {string} medicationId
 * @param {string} date YYYY-MM-DD
 * @returns {Promise<LogRecord[]>}
 */
export async function getDosesForDay(db, medicationId, date) {
  return getLogsForMedicationOnDate(db, medicationId, date);
}

/**
 * Update log status with inventory rules applied.
 * Only 'taken' triggers inventory deduction; missed/skipped/pending do not.
 * @param {import('expo-sqlite').SQLiteDatabase} db
 * @param {string} logId
 * @param {LogStatus} status
 * @param {Object} [options]
 * @param {string|null} [options.notes]
 * @returns {Promise<MarkDoseTakenResult|{ log: LogRecord, inventoryUpdated: false, inventory: null }>}
 */
export async function updateDoseStatus(db, logId, status, options = {}) {
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
