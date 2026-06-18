import { useCallback, useEffect, useState } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { getDashboardStats } from '../services/dashboard';
import type { DashboardStats } from '../types/app';

export function useDashboard() {
  const { db, isReady } = useDatabase();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!db) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await getDashboardStats(db);
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load dashboard'));
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  useEffect(() => {
    if (isReady) {
      refresh();
    }
  }, [isReady, refresh]);

  return {
    stats,
    isLoading,
    error,
    refresh,
  };
}
