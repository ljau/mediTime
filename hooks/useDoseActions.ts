import { useCallback, useState } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { skipDose, snoozeDose, takeDose } from '../services/doses';
import type { DoseActionInput } from '../types/app';

export function useDoseActions(onComplete?: () => void) {
  const { db } = useDatabase();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const runAction = useCallback(
    async (action: (database: NonNullable<typeof db>, input: DoseActionInput) => Promise<unknown>, input: DoseActionInput) => {
      if (!db) return;

      setIsProcessing(true);
      setError(null);

      try {
        await action(db, input);
        onComplete?.();
      } catch (err) {
        setError(err);
        throw err;
      } finally {
        setIsProcessing(false);
      }
    },
    [db, onComplete]
  );

  const markTaken = useCallback(
    (input: DoseActionInput) => runAction(takeDose, input),
    [runAction]
  );

  const markSkipped = useCallback(
    (input: DoseActionInput) => runAction(skipDose, input),
    [runAction]
  );

  const markSnoozed = useCallback(
    (input: DoseActionInput) => runAction(snoozeDose, input),
    [runAction]
  );

  return { markTaken, markSkipped, markSnoozed, isProcessing, error };
}
