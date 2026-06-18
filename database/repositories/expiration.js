import { EXPIRATION_QUERIES } from '../queries/expiration';
import {
  addDaysToIsoDate,
  EXPIRING_SOON_DAYS,
  getTodayIsoDate,
} from '../../utils/inventory';

function mapExpirationMedicationRow(row) {
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
 * @returns {Promise<ReturnType<typeof mapExpirationMedicationRow>[]>}
 */
export async function getExpiredMedications(db) {
  const today = getTodayIsoDate();
  const rows = await db.getAllAsync(EXPIRATION_QUERIES.GET_EXPIRED_MEDICATIONS, [today]);
  return rows.map(mapExpirationMedicationRow);
}

/**
 * @param {import('expo-sqlite').SQLiteDatabase} db
 * @param {number} [withinDays=EXPIRING_SOON_DAYS]
 * @returns {Promise<ReturnType<typeof mapExpirationMedicationRow>[]>}
 */
export async function getExpiringMedications(db, withinDays = EXPIRING_SOON_DAYS) {
  const today = getTodayIsoDate();
  const expiringByDate = addDaysToIsoDate(today, withinDays);

  const rows = await db.getAllAsync(EXPIRATION_QUERIES.GET_EXPIRING_MEDICATIONS, [
    today,
    expiringByDate,
  ]);

  return rows.map(mapExpirationMedicationRow);
}

/**
 * @param {import('expo-sqlite').SQLiteDatabase} db
 * @returns {Promise<ReturnType<typeof mapExpirationMedicationRow>[]>}
 */
export async function getMedicationsWithExpiration(db) {
  const rows = await db.getAllAsync(EXPIRATION_QUERIES.GET_MEDICATIONS_WITH_EXPIRATION);
  return rows.map(mapExpirationMedicationRow);
}

/**
 * @param {import('expo-sqlite').SQLiteDatabase} db
 * @param {number} [withinDays=EXPIRING_SOON_DAYS]
 * @returns {Promise<{ expiredCount: number, expiringSoonCount: number }>}
 */
export async function getExpirationSummary(db, withinDays = EXPIRING_SOON_DAYS) {
  const today = getTodayIsoDate();
  const expiringByDate = addDaysToIsoDate(today, withinDays);

  const row = await db.getFirstAsync(EXPIRATION_QUERIES.GET_EXPIRATION_SUMMARY, [
    today,
    today,
    expiringByDate,
  ]);

  return {
    expiredCount: row?.expired_count ?? 0,
    expiringSoonCount: row?.expiring_soon_count ?? 0,
  };
}
