import { useCallback, useEffect, useState } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { getHistoryEntries } from '../services/history';
import type { HistoryEntry, HistoryFilter } from '../types/app';

export function useHistory(filter: HistoryFilter, medicationId?: string) {
  const { db, isReady } = useDatabase();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const refresh = useCallback(async () => {
    if (!db) return;

    setIsLoading(true);
    setError(null);

    try {
      const rows = await getHistoryEntries(db, filter, medicationId);
      setEntries(rows);
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [db, filter, medicationId]);

  useEffect(() => {
    if (isReady) {
      refresh();
    }
  }, [isReady, refresh]);

  return { entries, isLoading, error, refresh };
}
