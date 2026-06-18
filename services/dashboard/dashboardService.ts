import type { SQLiteDatabase } from 'expo-sqlite';
import { getExpirationSummary } from '../../database/repositories/expiration';
import { getLowStockMedications } from '../../database/repositories/inventory';
import { getActiveSchedulesWithMedications } from '../../database/repositories/schedules';
import type { DashboardStats } from '../../types/app';
import { getTodayIsoDate } from '../../utils/inventory';
import {
  findNextScheduledDose,
  getScheduledDosesForDate,
  type ScheduledDose,
} from '../../utils/schedules';

export type { DashboardStats };

interface TodayLogRow {
  schedule_id: string;
  scheduled_at: string;
  status: string;
}

interface CountRow {
  count: number;
}

async function countMissedDosesToday(
  db: SQLiteDatabase,
  date: string,
  todayDoses: ScheduledDose[]
): Promise<number> {
  const now = new Date();

  const todayLogs = await db.getAllAsync<TodayLogRow>(
    `SELECT schedule_id, scheduled_at, status
     FROM logs
     WHERE substr(scheduled_at, 1, 10) = ?`,
    [date]
  );

  const logByKey = new Map(
    todayLogs.map((log) => [`${log.schedule_id}:${log.scheduled_at}`, log.status])
  );

  let missed = 0;

  for (const dose of todayDoses) {
    const doseTime = new Date(dose.scheduledAt);
    if (doseTime > now) continue;

    const status = logByKey.get(`${dose.scheduleId}:${dose.scheduledAt}`);
    if (status === 'taken' || status === 'skipped') continue;

    missed += 1;
  }

  return missed;
}

/**
 * Load all dashboard statistics.
 */
export async function getDashboardStats(db: SQLiteDatabase): Promise<DashboardStats> {
  const today = getTodayIsoDate();

  const [totalRow, schedules, lowStockMeds, expirationSummary] = await Promise.all([
    db.getFirstAsync<CountRow>(
      `SELECT COUNT(*) AS count
       FROM medications
       WHERE deleted_at IS NULL AND is_active = 1`
    ),
    getActiveSchedulesWithMedications(db),
    getLowStockMedications(db),
    getExpirationSummary(db),
  ]);

  const todayDoses = getScheduledDosesForDate(schedules, today);
  const medicationsDueToday = new Set(todayDoses.map((dose) => dose.medicationId)).size;
  const missedDosesToday = await countMissedDosesToday(db, today, todayDoses);
  const nextDose = findNextScheduledDose(schedules, today);

  return {
    totalMedications: totalRow?.count ?? 0,
    medicationsDueToday,
    dosesDueToday: todayDoses.length,
    missedDosesToday,
    lowStockCount: lowStockMeds.length,
    expiringCount: expirationSummary.expiringSoonCount,
    nextDose,
  };
}
