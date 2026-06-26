import type { SQLiteDatabase } from 'expo-sqlite';
import { getRecentLogsByMedicationId } from '../../database/repositories/logs';
import { getMedicationById } from '../../database/repositories/medications';
import { getAllSchedulesByMedicationId } from '../../database/repositories/schedules';
import type { MedicationDetailData } from '../../types/app';
import { getMedicationTodayDoses, processMissedDoses } from '../doses/doseService';
import { getTodayIsoDate } from '../../utils/inventory';

export async function getMedicationDetailData(
  db: SQLiteDatabase,
  medicationId: string
): Promise<MedicationDetailData | null> {
  const medication = await getMedicationById(db, medicationId);
  if (!medication) return null;

  await processMissedDoses(db, getTodayIsoDate());

  const [schedules, todayDoses, recentLogs] = await Promise.all([
    getAllSchedulesByMedicationId(db, medicationId),
    getMedicationTodayDoses(db, medicationId),
    getRecentLogsByMedicationId(db, medicationId, 10),
  ]);

  return { medication, schedules, todayDoses, recentLogs };
}
