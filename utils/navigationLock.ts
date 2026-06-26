let locked = false;

export function tryAcquireNavigationLock(): boolean {
  if (locked) return false;
  locked = true;
  return true;
}

export function releaseNavigationLock(): void {
  locked = false;
}
