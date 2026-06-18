import type { SQLiteDatabase } from 'expo-sqlite';
import type { InventoryReductionResult, MedicationRecord } from '../../types/app';
import { INVENTORY_QUERIES } from '../queries/inventory';

export type { InventoryReductionResult };

interface MedicationInventoryRow {
  id: string;
  name: string;
  dosage: string | null;
  remaining_count: number;
  low_stock_threshold: number;
  expiration_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface RemainingCountRow {
  remaining_count: number;
}

interface InventoryStatusRow {
  remaining_count: number;
  low_stock_threshold: number;
}

interface CrossedLowStockRow {
  id: string;
}

function mapLowStockMedicationRow(row: MedicationInventoryRow): MedicationRecord {
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

export async function getRemainingCount(
  db: SQLiteDatabase,
  medicationId: string
): Promise<number | null> {
  const row = await db.getFirstAsync<RemainingCountRow>(INVENTORY_QUERIES.GET_REMAINING_COUNT, [
    medicationId,
  ]);

  return row?.remaining_count ?? null;
}

/**
 * Reduce inventory when a dose is taken. Quantity never goes below zero.
 */
export async function reduceInventory(
  db: SQLiteDatabase,
  medicationId: string,
  amount: number
): Promise<InventoryReductionResult | null> {
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

export async function addInventory(
  db: SQLiteDatabase,
  medicationId: string,
  amount: number
): Promise<{ previousCount: number; newCount: number } | null> {
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

export async function getInventoryStatus(
  db: SQLiteDatabase,
  medicationId: string
): Promise<{ remainingCount: number; lowStockThreshold: number; isLowStock: boolean } | null> {
  const row = await db.getFirstAsync<InventoryStatusRow>(INVENTORY_QUERIES.IS_LOW_STOCK, [
    medicationId,
  ]);

  if (!row) return null;

  return {
    remainingCount: row.remaining_count,
    lowStockThreshold: row.low_stock_threshold,
    isLowStock: row.remaining_count <= row.low_stock_threshold,
  };
}

export async function getLowStockMedications(db: SQLiteDatabase): Promise<MedicationRecord[]> {
  const rows = await db.getAllAsync<MedicationInventoryRow>(
    INVENTORY_QUERIES.GET_LOW_STOCK_MEDICATIONS
  );
  return rows.map(mapLowStockMedicationRow);
}

/**
 * Returns true when quantity dropped from above threshold to at/below threshold.
 */
export async function crossedIntoLowStock(
  db: SQLiteDatabase,
  medicationId: string,
  previousCount: number
): Promise<boolean> {
  const row = await db.getFirstAsync<CrossedLowStockRow>(INVENTORY_QUERIES.CROSSED_INTO_LOW_STOCK, [
    medicationId,
    previousCount,
  ]);

  return Boolean(row);
}
