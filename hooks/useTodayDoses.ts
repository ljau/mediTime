import { useCallback, useEffect, useState } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { getTodayDosesWithStatus, processMissedDoses } from '../services/doses';
import type { TodayDose } from '../types/app';

export function useTodayDoses(date?: string) {
  const { db, isReady } = useDatabase();
  const [doses, setDoses] = useState<TodayDose[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const refresh = useCallback(async () => {
    if (!db) return;

    setIsLoading(true);
    setError(null);

    try {
      await processMissedDoses(db, date);
      const rows = await getTodayDosesWithStatus(db, date);
      setDoses(rows);
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [db, date]);

  useEffect(() => {
    if (isReady) {
      refresh();
    }
  }, [isReady, refresh]);

  return { doses, isLoading, error, refresh };
}
