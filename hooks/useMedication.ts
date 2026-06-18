import { useCallback, useEffect, useState } from 'react';
import { getMedicationById } from '../database/repositories/medications';
import { useDatabase } from '../context/DatabaseContext';
import type { MedicationRecord } from '../types/app';

export function useMedication(id: string | undefined) {
  const { db, isReady } = useDatabase();
  const [medication, setMedication] = useState<MedicationRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const refresh = useCallback(async () => {
    if (!db || !id) return;

    setIsLoading(true);
    setError(null);

    try {
      const row = await getMedicationById(db, id);
      setMedication(row);
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [db, id]);

  useEffect(() => {
    if (isReady && id) {
      refresh();
    }
  }, [isReady, id, refresh]);

  return { medication, isLoading, error, refresh };
}
