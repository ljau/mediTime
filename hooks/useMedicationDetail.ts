import { useCallback, useEffect, useState } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { getMedicationDetailData } from '../services/medications';
import type { MedicationDetailData } from '../types/app';

export function useMedicationDetail(medicationId: string | undefined) {
  const { db, isReady } = useDatabase();
  const [data, setData] = useState<MedicationDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const refresh = useCallback(async () => {
    if (!db || !medicationId) return;

    setIsLoading(true);
    setError(null);

    try {
      const detail = await getMedicationDetailData(db, medicationId);
      setData(detail);
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [db, medicationId]);

  useEffect(() => {
    if (isReady && medicationId) {
      refresh();
    }
  }, [isReady, medicationId, refresh]);

  return { data, isLoading, error, refresh };
}
