import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { SQLiteDatabase } from 'expo-sqlite';
import { getDatabase } from '../database';
import type { DatabaseContextValue } from '../types/app';

const DatabaseContext = createContext<DatabaseContextValue>({
  db: null,
  isReady: false,
  error: null,
});

export function DatabaseProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<SQLiteDatabase | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let isMounted = true;

    async function setup() {
      try {
        const database = await getDatabase();
        if (isMounted) {
          setDb(database);
          setIsReady(true);
        }
      } catch (err) {
        if (isMounted) {
          setError(err);
        }
      }
    }

    setup();

    return () => {
      isMounted = false;
    };
  }, []);

  const value = useMemo(
    () => ({ db, isReady, error }),
    [db, isReady, error]
  );

  return (
    <DatabaseContext.Provider value={value}>
      {children}
    </DatabaseContext.Provider>
  );
}

export function useDatabase(): DatabaseContextValue {
  return useContext(DatabaseContext);
}
