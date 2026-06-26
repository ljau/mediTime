import { useCallback, useEffect, useState } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { getMedicationSchedules } from '../services/schedules';
import type { ScheduleRecord } from '../types/app';

export function useSchedules(medicationId: string | undefined, includeInactive = true) {
  const { db, isReady } = useDatabase();
  const [schedules, setSchedules] = useState<ScheduleRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const refresh = useCallback(async () => {
    if (!db || !medicationId) return;

    setIsLoading(true);
    setError(null);

    try {
      const rows = await getMedicationSchedules(db, medicationId, includeInactive);
      setSchedules(rows);
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [db, medicationId, includeInactive]);

  useEffect(() => {
    if (isReady && medicationId) {
      refresh();
    }
  }, [isReady, medicationId, refresh]);

  return { schedules, isLoading, error, refresh };
}
