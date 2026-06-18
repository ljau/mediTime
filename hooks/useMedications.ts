import { useCallback, useEffect, useState } from 'react';
import { getAllMedications } from '../database/repositories/medications';
import { useDatabase } from '../context/DatabaseContext';
import type { MedicationRecord } from '../types/app';

export function useMedications() {
  const { db, isReady } = useDatabase();
  const [medications, setMedications] = useState<MedicationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const refresh = useCallback(async () => {
    if (!db) return;

    setIsLoading(true);
    setError(null);

    try {
      const rows = await getAllMedications(db);
      setMedications(rows);
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  useEffect(() => {
    if (isReady) {
      refresh();
    }
  }, [isReady, refresh]);

  return { medications, isLoading, error, refresh };
}
