import { useCallback, useRef } from 'react';

const SYNC_LOCK_MS = 500;

export function useIdempotentCallback<T extends (...args: never[]) => unknown>(
  callback: T
): T {
  const pendingRef = useRef(false);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  return useCallback((...args: Parameters<T>) => {
    if (pendingRef.current) return;
    pendingRef.current = true;

    const release = () => {
      pendingRef.current = false;
    };

    try {
      const result = callbackRef.current(...args);
      if (result instanceof Promise) {
        void result.finally(release);
      } else {
        setTimeout(release, SYNC_LOCK_MS);
      }
    } catch (error) {
      release();
      throw error;
    }
  }, []) as T;
}
