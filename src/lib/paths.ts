/** Default locale (vi) has no URL prefix; the others do. Mirrors i18n/routing.ts. */
export function localizedPath(locale: string, path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return locale === 'vi' ? p : `/${locale}${p === '/' ? '' : p}`;
}
