import { useCallback, useEffect, useState } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { getDashboardStats } from '../services/dashboard';

/**
 * @typedef {import('../services/dashboard/dashboardService').DashboardStats} DashboardStats
 */

/**
 * @returns {{
 *   stats: DashboardStats|null,
 *   isLoading: boolean,
 *   error: Error|null,
 *   refresh: () => Promise<void>,
 * }}
 */
export function useDashboard() {
  const { db, isReady } = useDatabase();
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

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
