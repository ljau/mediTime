import type { SQLiteDatabase } from 'expo-sqlite';
import { getExpiringMedications, getExpirationSummary } from '../../database/repositories/expiration';
import { getLowStockMedications } from '../../database/repositories/inventory';
import { getActiveSchedulesWithMedications } from '../../database/repositories/schedules';
import type { DashboardStats } from '../../types/app';
import { getTodayIsoDate } from '../../utils/inventory';
import {
  findNextScheduledDose,
  getScheduledDosesForDate,
  type ScheduledDose,
} from '../../utils/schedules';
import { getTodayDosesWithStatus, processMissedDoses } from '../doses/doseService';

export type { DashboardStats };

/**
 * Load all dashboard statistics from SQLite.
 */
export async function getDashboardStats(db: SQLiteDatabase): Promise<DashboardStats> {
  const today = getTodayIsoDate();

  await processMissedDoses(db, today);

  const [totalRow, schedules, lowStockMeds, expiringMeds, expirationSummary, todayDoses] =
    await Promise.all([
      db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) AS count
         FROM medications
         WHERE deleted_at IS NULL AND is_active = 1`
      ),
      getActiveSchedulesWithMedications(db),
      getLowStockMedications(db),
      getExpiringMedications(db),
      getExpirationSummary(db),
      getTodayDosesWithStatus(db, today),
    ]);

  const scheduledToday = getScheduledDosesForDate(schedules, today);
  const medicationsDueToday = new Set(scheduledToday.map((dose) => dose.medicationId)).size;
  const missedDosesToday = todayDoses.filter(
    (dose) => dose.status === 'missed'
  ).length;
  const nextDose = findNextScheduledDose(schedules, today);

  return {
    totalMedications: totalRow?.count ?? 0,
    medicationsDueToday,
    dosesDueToday: scheduledToday.length,
    missedDosesToday,
    lowStockCount: lowStockMeds.length,
    expiringCount: expirationSummary.expiringSoonCount,
    nextDose,
    todayDoses,
    lowStockMedications: lowStockMeds,
    expiringMedications: expiringMeds,
  };
}
