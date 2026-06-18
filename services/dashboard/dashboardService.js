import { getExpirationSummary } from '../../database/repositories/expiration';
import { getLowStockMedications } from '../../database/repositories/inventory';
import { getActiveSchedulesWithMedications } from '../../database/repositories/schedules';
import { getTodayIsoDate } from '../../utils/inventory';
import {
  findNextScheduledDose,
  getScheduledDosesForDate,
} from '../../utils/schedules';

/**
 * @typedef {Object} DashboardStats
 * @property {number} totalMedications
 * @property {number} medicationsDueToday
 * @property {number} dosesDueToday
 * @property {number} missedDosesToday
 * @property {number} lowStockCount
 * @property {number} expiringCount
 * @property {import('../../utils/schedules').ScheduledDose|null} nextDose
 */

/**
 * @param {import('expo-sqlite').SQLiteDatabase} db
 * @param {string} date YYYY-MM-DD
 * @param {import('../../utils/schedules').ScheduledDose[]} todayDoses
 * @returns {Promise<number>}
 */
async function countMissedDosesToday(db, date, todayDoses) {
  const now = new Date();

  const todayLogs = await db.getAllAsync(
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
 * @param {import('expo-sqlite').SQLiteDatabase} db
 * @returns {Promise<DashboardStats>}
 */
export async function getDashboardStats(db) {
  const today = getTodayIsoDate();

  const [totalRow, schedules, lowStockMeds, expirationSummary] = await Promise.all([
    db.getFirstAsync(
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
