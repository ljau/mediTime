import type { Href } from 'expo-router';

export const RETURN_TO_PARAM = 'returnTo';

export function parseReturnTo(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw && raw.startsWith('/')) {
    return raw;
  }
  return undefined;
}

export function withReturnTo(href: string, returnTo: string): string {
  const separator = href.includes('?') ? '&' : '?';
  return `${href}${separator}${RETURN_TO_PARAM}=${encodeURIComponent(returnTo)}`;
}

export function getMedicationsBackHref(
  pathname: string,
  returnTo?: string
): Href | undefined {
  if (!pathname.startsWith('/medications')) return undefined;

  if (pathname.endsWith('/edit')) {
    const detailsPath = pathname.slice(0, -'/edit'.length);
    return detailsPath || '/medications';
  }

  if (pathname.endsWith('/new')) {
    return returnTo ?? '/medications';
  }

  const match = pathname.match(/^\/medications\/([^/]+)$/);
  if (match && match[1] !== 'new') {
    return returnTo ?? '/medications';
  }

  return undefined;
}
