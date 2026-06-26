import type { SQLiteDatabase } from 'expo-sqlite';
import { getLogsInDateRange } from '../../database/repositories/logs';
import type { HistoryEntry, HistoryFilter } from '../../types/app';
import { getHistoryDateRange } from '../doses/doseService';

export type { HistoryEntry, HistoryFilter };

export async function getHistoryEntries(
  db: SQLiteDatabase,
  filter: HistoryFilter,
  medicationId?: string
): Promise<HistoryEntry[]> {
  if (filter === 'medication') {
    if (!medicationId) return [];
    const endDate = new Date().toISOString().slice(0, 10);
    const startDate = '1970-01-01';
    return getLogsInDateRange(db, startDate, endDate, medicationId);
  }

  const rangeFilter = filter;
  const { startDate, endDate } = getHistoryDateRange(rangeFilter);

  return getLogsInDateRange(db, startDate, endDate);
}
