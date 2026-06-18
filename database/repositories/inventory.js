import { INVENTORY_QUERIES } from '../queries/inventory';

function mapLowStockMedicationRow(row) {
  return {
    id: row.id,
    name: row.name,
    dosage: row.dosage,
    quantity: row.remaining_count,
    refillThreshold: row.low_stock_threshold,
    expirationDate: row.expiration_date,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * @typedef {Object} InventoryReductionResult
 * @property {number} previousCount
 * @property {number} newCount
 * @property {number} requestedReduction
 * @property {number} actualReduction
 */

/**
 * @param {import('expo-sqlite').SQLiteDatabase} db
 * @param {string} medicationId
 * @returns {Promise<number|null>}
 */
export async function getRemainingCount(db, medicationId) {
  const row = await db.getFirstAsync(INVENTORY_QUERIES.GET_REMAINING_COUNT, [
    medicationId,
  ]);

  return row?.remaining_count ?? null;
}

/**
 * Reduce inventory when a dose is taken. Quantity never goes below zero.
 * @param {import('expo-sqlite').SQLiteDatabase} db
 * @param {string} medicationId
 * @param {number} amount Units to deduct (rounded to whole pills).
 * @returns {Promise<InventoryReductionResult|null>}
 */
export async function reduceInventory(db, medicationId, amount) {
  const previousCount = await getRemainingCount(db, medicationId);
  if (previousCount === null) return null;

  const requestedReduction = Math.max(0, Math.round(amount));
  if (requestedReduction === 0) {
    return {
      previousCount,
      newCount: previousCount,
      requestedReduction: 0,
      actualReduction: 0,
    };
  }

  const now = new Date().toISOString();

  await db.runAsync(INVENTORY_QUERIES.REDUCE_REMAINING_COUNT, [
    requestedReduction,
    now,
    medicationId,
  ]);

  const newCount = await getRemainingCount(db, medicationId);
  const actualReduction = previousCount - (newCount ?? 0);

  return {
    previousCount,
    newCount: newCount ?? 0,
    requestedReduction,
    actualReduction,
  };
}

/**
 * @param {import('expo-sqlite').SQLiteDatabase} db
 * @param {string} medicationId
 * @param {number} amount
 * @returns {Promise<{ previousCount: number, newCount: number }|null>}
 */
export async function addInventory(db, medicationId, amount) {
  const previousCount = await getRemainingCount(db, medicationId);
  if (previousCount === null) return null;

  const quantityToAdd = Math.max(0, Math.floor(amount));
  if (quantityToAdd === 0) {
    return { previousCount, newCount: previousCount };
  }

  const now = new Date().toISOString();

  await db.runAsync(INVENTORY_QUERIES.ADD_REMAINING_COUNT, [
    quantityToAdd,
    now,
    medicationId,
  ]);

  const newCount = await getRemainingCount(db, medicationId);

  return {
    previousCount,
    newCount: newCount ?? previousCount,
  };
}

/**
 * @param {import('expo-sqlite').SQLiteDatabase} db
 * @param {string} medicationId
 * @returns {Promise<{ remainingCount: number, lowStockThreshold: number, isLowStock: boolean }|null>}
 */
export async function getInventoryStatus(db, medicationId) {
  const row = await db.getFirstAsync(INVENTORY_QUERIES.IS_LOW_STOCK, [
    medicationId,
  ]);

  if (!row) return null;

  return {
    remainingCount: row.remaining_count,
    lowStockThreshold: row.low_stock_threshold,
    isLowStock: row.remaining_count <= row.low_stock_threshold,
  };
}

/**
 * @param {import('expo-sqlite').SQLiteDatabase} db
 * @returns {Promise<ReturnType<typeof mapLowStockMedicationRow>[]>}
 */
export async function getLowStockMedications(db) {
  const rows = await db.getAllAsync(INVENTORY_QUERIES.GET_LOW_STOCK_MEDICATIONS);
  return rows.map(mapLowStockMedicationRow);
}

/**
 * Returns true when quantity dropped from above threshold to at/below threshold.
 * @param {import('expo-sqlite').SQLiteDatabase} db
 * @param {string} medicationId
 * @param {number} previousCount
 * @returns {Promise<boolean>}
 */
export async function crossedIntoLowStock(db, medicationId, previousCount) {
  const row = await db.getFirstAsync(INVENTORY_QUERIES.CROSSED_INTO_LOW_STOCK, [
    medicationId,
    previousCount,
  ]);

  return Boolean(row);
}
