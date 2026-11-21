/**
 * Single source of truth for "where does this app live?".
 *
 * Fixes the v1 bug where Supabase confirmation emails pointed to localhost:3000:
 *  1. We always pass `emailRedirectTo` explicitly (see authRedirectUrl below).
 *  2. Supabase Dashboard -> Auth -> URL Configuration must list the same origin
 *     (see README, section 3).
 */
export function getSiteUrl(): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (typeof window !== 'undefined' ? window.location.origin : '');

  // Server-side last resort on Vercel (system env var, no protocol).
  const vercelProd =
    typeof window === 'undefined' && process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : '';

  return (fromEnv || vercelProd).replace(/\/+$/, '');
}

/** Use as `options.emailRedirectTo` in supabase.auth.signUp / signInWithOtp. */
export function authRedirectUrl(next = '/'): string {
  return `${getSiteUrl()}/auth/callback?next=${encodeURIComponent(next)}`;
}
