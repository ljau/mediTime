import type { Href } from 'expo-router';

export function getMedicationsBackHref(pathname: string): Href | undefined {
  if (!pathname.startsWith('/medications')) return undefined;

  if (pathname.endsWith('/edit')) {
    const detailsPath = pathname.slice(0, -'/edit'.length);
    return detailsPath || '/medications';
  }

  if (pathname.endsWith('/new')) {
    return '/medications';
  }

  const match = pathname.match(/^\/medications\/([^/]+)$/);
  if (match && match[1] !== 'new') {
    return '/medications';
  }

  return undefined;
}
