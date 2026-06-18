import type { SQLiteDatabase } from 'expo-sqlite';
import {
  addInventory,
  getInventoryStatus,
  getRemainingCount,
  reduceInventory,
} from '../../database/repositories/inventory';
import type { InventoryReductionResult } from '../../types/app';
import { processRefillReminder } from '../refill/refillReminderService';

/**
 * Deduct inventory for a taken dose. Quantity is clamped at zero.
 */
export async function deductForTakenDose(
  db: SQLiteDatabase,
  medicationId: string,
  doseAmount: number
): Promise<InventoryReductionResult | null> {
  const result = await reduceInventory(db, medicationId, doseAmount);

  if (result && result.actualReduction > 0) {
    await processRefillReminder(db, medicationId, {
      previousCount: result.previousCount,
    });
  }

  return result;
}

export async function getMedicationQuantity(
  db: SQLiteDatabase,
  medicationId: string
): Promise<number | null> {
  return getRemainingCount(db, medicationId);
}

export async function getMedicationInventoryStatus(
  db: SQLiteDatabase,
  medicationId: string
): Promise<Awaited<ReturnType<typeof getInventoryStatus>>> {
  return getInventoryStatus(db, medicationId);
}

export async function refillMedication(
  db: SQLiteDatabase,
  medicationId: string,
  quantityAdded: number
): Promise<{ previousCount: number; newCount: number } | null> {
  const previousCount = await getRemainingCount(db, medicationId);
  const result = await addInventory(db, medicationId, quantityAdded);

  if (result && previousCount !== null) {
    await processRefillReminder(db, medicationId, { previousCount });
  }

  return result;
}

/**
 * Re-evaluate refill reminders after a manual quantity or threshold change.
 */
export async function checkRefillReminder(
  db: SQLiteDatabase,
  medicationId: string,
  options: { previousCount?: number } = {}
) {
  return processRefillReminder(db, medicationId, options);
}
