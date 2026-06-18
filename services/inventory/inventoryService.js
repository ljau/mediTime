import {
  addInventory,
  getInventoryStatus,
  getRemainingCount,
  reduceInventory,
} from '../../database/repositories/inventory';
import { processRefillReminder } from '../refill/refillReminderService';

/**
 * @typedef {import('../../database/repositories/inventory').InventoryReductionResult} InventoryReductionResult
 */

/**
 * Deduct inventory for a taken dose. Quantity is clamped at zero.
 * @param {import('expo-sqlite').SQLiteDatabase} db
 * @param {string} medicationId
 * @param {number} doseAmount
 * @returns {Promise<InventoryReductionResult|null>}
 */
export async function deductForTakenDose(db, medicationId, doseAmount) {
  const result = await reduceInventory(db, medicationId, doseAmount);

  if (result && result.actualReduction > 0) {
    await processRefillReminder(db, medicationId, {
      previousCount: result.previousCount,
    });
  }

  return result;
}

/**
 * @param {import('expo-sqlite').SQLiteDatabase} db
 * @param {string} medicationId
 * @returns {Promise<number|null>}
 */
export async function getMedicationQuantity(db, medicationId) {
  return getRemainingCount(db, medicationId);
}

/**
 * @param {import('expo-sqlite').SQLiteDatabase} db
 * @param {string} medicationId
 * @returns {Promise<ReturnType<typeof getInventoryStatus>>}
 */
export async function getMedicationInventoryStatus(db, medicationId) {
  return getInventoryStatus(db, medicationId);
}

/**
 * @param {import('expo-sqlite').SQLiteDatabase} db
 * @param {string} medicationId
 * @param {number} quantityAdded
 * @returns {Promise<{ previousCount: number, newCount: number }|null>}
 */
export async function refillMedication(db, medicationId, quantityAdded) {
  const previousCount = await getRemainingCount(db, medicationId);
  const result = await addInventory(db, medicationId, quantityAdded);

  if (result && previousCount !== null) {
    await processRefillReminder(db, medicationId, { previousCount });
  }

  return result;
}

/**
 * Re-evaluate refill reminders after a manual quantity or threshold change.
 * @param {import('expo-sqlite').SQLiteDatabase} db
 * @param {string} medicationId
 * @param {{ previousCount?: number }} [options]
 */
export async function checkRefillReminder(db, medicationId, options = {}) {
  return processRefillReminder(db, medicationId, options);
}
