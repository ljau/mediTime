import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { useCallback } from 'react';
import { releaseNavigationLock, tryAcquireNavigationLock } from '../utils/navigationLock';

const NAVIGATION_LOCK_MS = 1000;

function navigateWithLock(action: () => void) {
  if (!tryAcquireNavigationLock()) return;
  action();
  setTimeout(releaseNavigationLock, NAVIGATION_LOCK_MS);
}

export function useIdempotentRouter() {
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      releaseNavigationLock();
    }, [])
  );

  const push = useCallback(
    (href: Href) => {
      navigateWithLock(() => router.push(href));
    },
    [router]
  );

  const replace = useCallback(
    (href: Href) => {
      navigateWithLock(() => router.replace(href));
    },
    [router]
  );

  const back = useCallback(() => {
    navigateWithLock(() => router.back());
  }, [router]);

  const dismissTo = useCallback(
    (href: Href) => {
      navigateWithLock(() => router.dismissTo(href));
    },
    [router]
  );

  return {
    ...router,
    push,
    replace,
    back,
    dismissTo,
  };
}
