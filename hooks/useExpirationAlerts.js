import { useCallback, useEffect, useState } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import {
  getExpiredMedications,
  getExpirationSummary,
  getExpiringMedications,
} from '../database/repositories/expiration';

/**
 * @typedef {import('../database/repositories/medications').MedicationRecord} MedicationRecord
 */

/**
 * @typedef {Object} ExpirationAlertsState
 * @property {MedicationRecord[]} expired
 * @property {MedicationRecord[]} expiringSoon
 * @property {number} expiredCount
 * @property {number} expiringSoonCount
 * @property {boolean} isLoading
 * @property {Error|null} error
 * @property {() => Promise<void>} refresh
 */

/**
 * @returns {ExpirationAlertsState}
 */
export function useExpirationAlerts() {
  const { db, isReady } = useDatabase();
  const [expired, setExpired] = useState([]);
  const [expiringSoon, setExpiringSoon] = useState([]);
  const [expiredCount, setExpiredCount] = useState(0);
  const [expiringSoonCount, setExpiringSoonCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!db) return;

    setIsLoading(true);
    setError(null);

    try {
      const [summary, expiredMeds, expiringMeds] = await Promise.all([
        getExpirationSummary(db),
        getExpiredMedications(db),
        getExpiringMedications(db),
      ]);

      setExpiredCount(summary.expiredCount);
      setExpiringSoonCount(summary.expiringSoonCount);
      setExpired(expiredMeds);
      setExpiringSoon(expiringMeds);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load expiration alerts'));
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
    expired,
    expiringSoon,
    expiredCount,
    expiringSoonCount,
    isLoading,
    error,
    refresh,
  };
}
