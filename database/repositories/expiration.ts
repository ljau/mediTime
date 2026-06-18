import type { SQLiteDatabase } from 'expo-sqlite';
import type { MedicationRecord } from '../../types/app';
import {
  addDaysToIsoDate,
  EXPIRING_SOON_DAYS,
  getTodayIsoDate,
} from '../../utils/inventory';
import { EXPIRATION_QUERIES } from '../queries/expiration';

interface ExpirationMedicationRow {
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

interface ExpirationSummaryRow {
  expired_count: number;
  expiring_soon_count: number;
}

function mapExpirationMedicationRow(row: ExpirationMedicationRow): MedicationRecord {
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

export async function getExpiredMedications(db: SQLiteDatabase): Promise<MedicationRecord[]> {
  const today = getTodayIsoDate();
  const rows = await db.getAllAsync<ExpirationMedicationRow>(
    EXPIRATION_QUERIES.GET_EXPIRED_MEDICATIONS,
    [today]
  );
  return rows.map(mapExpirationMedicationRow);
}

export async function getExpiringMedications(
  db: SQLiteDatabase,
  withinDays: number = EXPIRING_SOON_DAYS
): Promise<MedicationRecord[]> {
  const today = getTodayIsoDate();
  const expiringByDate = addDaysToIsoDate(today, withinDays);

  const rows = await db.getAllAsync<ExpirationMedicationRow>(
    EXPIRATION_QUERIES.GET_EXPIRING_MEDICATIONS,
    [today, expiringByDate]
  );

  return rows.map(mapExpirationMedicationRow);
}

export async function getMedicationsWithExpiration(
  db: SQLiteDatabase
): Promise<MedicationRecord[]> {
  const rows = await db.getAllAsync<ExpirationMedicationRow>(
    EXPIRATION_QUERIES.GET_MEDICATIONS_WITH_EXPIRATION
  );
  return rows.map(mapExpirationMedicationRow);
}

export async function getExpirationSummary(
  db: SQLiteDatabase,
  withinDays: number = EXPIRING_SOON_DAYS
): Promise<{ expiredCount: number; expiringSoonCount: number }> {
  const today = getTodayIsoDate();
  const expiringByDate = addDaysToIsoDate(today, withinDays);

  const row = await db.getFirstAsync<ExpirationSummaryRow>(
    EXPIRATION_QUERIES.GET_EXPIRATION_SUMMARY,
    [today, today, expiringByDate]
  );

  return {
    expiredCount: row?.expired_count ?? 0,
    expiringSoonCount: row?.expiring_soon_count ?? 0,
  };
}
