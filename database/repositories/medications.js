import { generateId } from '../utils/ids';

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

/**
 * @typedef {Object} MedicationInput
 * @property {string} name
 * @property {string|null} [dosage]
 * @property {number} quantity
 * @property {number} [refillThreshold]
 * @property {string|null} [expirationDate]
 * @property {string|null} [notes]
 */

/**
 * @typedef {Object} MedicationRecord
 * @property {string} id
 * @property {string} name
 * @property {string|null} dosage
 * @property {number} quantity
 * @property {number} refillThreshold
 * @property {string|null} expirationDate
 * @property {string|null} notes
 * @property {string} createdAt
 * @property {string} updatedAt
 */

function mapRow(row) {
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

/**
 * @param {import('expo-sqlite').SQLiteDatabase} db
 * @returns {Promise<MedicationRecord[]>}
 */
export async function getAllMedications(db) {
  const rows = await db.getAllAsync(
    `SELECT ${MEDICATION_COLUMNS}
     FROM medications
     WHERE deleted_at IS NULL
     ORDER BY name COLLATE NOCASE ASC`
  );

  return rows.map(mapRow);
}

/**
 * @param {import('expo-sqlite').SQLiteDatabase} db
 * @param {string} id
 * @returns {Promise<MedicationRecord|null>}
 */
export async function getMedicationById(db, id) {
  const row = await db.getFirstAsync(
    `SELECT ${MEDICATION_COLUMNS}
     FROM medications
     WHERE id = ? AND deleted_at IS NULL`,
    [id]
  );

  return mapRow(row);
}

/**
 * @param {import('expo-sqlite').SQLiteDatabase} db
 * @param {MedicationInput} data
 * @returns {Promise<MedicationRecord>}
 */
export async function createMedication(db, data) {
  const id = generateId();
  const now = new Date().toISOString();
  const quantity = Math.max(0, Math.floor(data.quantity ?? 0));
  const refillThreshold = Math.max(0, Math.floor(data.refillThreshold ?? 7));

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

/**
 * @param {import('expo-sqlite').SQLiteDatabase} db
 * @param {string} id
 * @param {MedicationInput} data
 * @returns {Promise<MedicationRecord|null>}
 */
export async function updateMedication(db, id, data) {
  const existing = await getMedicationById(db, id);
  if (!existing) return null;

  const now = new Date().toISOString();
  const quantity = Math.max(0, Math.floor(data.quantity ?? 0));
  const refillThreshold = Math.max(0, Math.floor(data.refillThreshold ?? 7));

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
 * @param {import('expo-sqlite').SQLiteDatabase} db
 * @param {string} id
 * @returns {Promise<boolean>}
 */
export async function deleteMedication(db, id) {
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
