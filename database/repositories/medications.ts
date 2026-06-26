import type { SQLiteDatabase } from 'expo-sqlite';
import type { MedicationInput, MedicationRecord } from '../../types/app';
import { generateId } from '../utils/ids';

export type { MedicationInput, MedicationRecord };

const MEDICATION_COLUMNS = `
  id,
  name,
  dosage,
  remaining_count,
  low_stock_threshold,
  expiration_date,
  notes,
  created_at,
  updated_at
`;

interface MedicationRow {
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

function mapRow(row: MedicationRow | null): MedicationRecord | null {
  if (!row) return null;

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

export async function getAllMedications(db: SQLiteDatabase): Promise<MedicationRecord[]> {
  const rows = await db.getAllAsync<MedicationRow>(
    `SELECT ${MEDICATION_COLUMNS}
     FROM medications
     WHERE deleted_at IS NULL
     ORDER BY name COLLATE NOCASE ASC`
  );

  return rows.map((row) => mapRow(row)!);
}

export async function getMedicationById(
  db: SQLiteDatabase,
  id: string
): Promise<MedicationRecord | null> {
  const row = await db.getFirstAsync<MedicationRow>(
    `SELECT ${MEDICATION_COLUMNS}
     FROM medications
     WHERE id = ? AND deleted_at IS NULL`,
    [id]
  );

  return mapRow(row);
}

export async function createMedication(
  db: SQLiteDatabase,
  data: MedicationInput
): Promise<MedicationRecord> {
  const id = generateId();
  const now = new Date().toISOString();
  const quantity = Math.max(0, Math.floor(data.quantity ?? 0));
  const refillThreshold = Math.max(0, Math.floor(data.refillThreshold ?? 0));

  await db.runAsync(
    `INSERT INTO medications (
      id,
      name,
      dosage,
      remaining_count,
      initial_count,
      low_stock_threshold,
      expiration_date,
      notes,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.name.trim(),
      data.dosage?.trim() || null,
      quantity,
      quantity,
      refillThreshold,
      data.expirationDate || null,
      data.notes?.trim() || null,
      now,
      now,
    ]
  );

  const medication = await getMedicationById(db, id);
  if (!medication) {
    throw new Error('Failed to create medication');
  }

  return medication;
}

export async function updateMedication(
  db: SQLiteDatabase,
  id: string,
  data: MedicationInput
): Promise<MedicationRecord | null> {
  const existing = await getMedicationById(db, id);
  if (!existing) return null;

  const now = new Date().toISOString();
  const quantity = Math.max(0, Math.floor(data.quantity ?? 0));
  const refillThreshold = Math.max(0, Math.floor(data.refillThreshold ?? 0));

  await db.runAsync(
    `UPDATE medications
     SET name = ?,
         dosage = ?,
         remaining_count = ?,
         low_stock_threshold = ?,
         expiration_date = ?,
         notes = ?,
         updated_at = ?
     WHERE id = ? AND deleted_at IS NULL`,
    [
      data.name.trim(),
      data.dosage?.trim() || null,
      quantity,
      refillThreshold,
      data.expirationDate || null,
      data.notes?.trim() || null,
      now,
      id,
    ]
  );

  return getMedicationById(db, id);
}

/**
 * Soft-delete a medication.
 */
export async function deleteMedication(db: SQLiteDatabase, id: string): Promise<boolean> {
  const existing = await getMedicationById(db, id);
  if (!existing) return false;

  const now = new Date().toISOString();

  await db.runAsync(
    `UPDATE medications
     SET deleted_at = ?, updated_at = ?, is_active = 0
     WHERE id = ? AND deleted_at IS NULL`,
    [now, now, id]
  );

  return true;
}
