import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getDatabase } from '../database';

const DatabaseContext = createContext({
  db: null,
  isReady: false,
  error: null,
});

export function DatabaseProvider({ children }) {
  const [db, setDb] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);

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

export function useDatabase() {
  return useContext(DatabaseContext);
}
