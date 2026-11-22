import { createServerClient } from '@supabase/ssr';
import type { EmailOtpType } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { routing } from '@/i18n/routing';

type PendingCookie = { name: string; value: string; options?: Record<string, unknown> };

function pickLocale(next: string, cookieLocale: string | undefined): (typeof routing.locales)[number] {
  const first = next.split('/')[1];
  const fromPath = routing.locales.find((l) => l === first);
  if (fromPath) return fromPath;
  return routing.locales.find((l) => l === cookieLocale) ?? routing.defaultLocale;
}

const withLocale = (locale: string, path: string) => (locale === routing.defaultLocale ? path : `/${locale}${path}`);

/**
 * Landing point of the email-confirmation link (PKCE flow, or token_hash flow).
 *  - The session cookies are written onto the redirect response itself, so the
 *    user arrives already signed in (no second login, no F5).
 *  - Someone with no family yet goes straight to /onboarding to create or join one.
 *  - Always redirects to the REAL site origin, never localhost.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const tokenHash = url.searchParams.get('token_hash');
  const otpType = url.searchParams.get('type') as EmailOtpType | null;
  const next = url.searchParams.get('next') ?? '/';

  // Open-redirect guard: only allow same-site relative paths.
  const safeNext = next.startsWith('/') && !next.startsWith('//') && !next.includes('\\') ? next : '/';
  const locale = pickLocale(safeNext, request.cookies.get('NEXT_LOCALE')?.value);

  const forwardedHost = request.headers.get('x-forwarded-host');
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, '') ||
    (forwardedHost ? `https://${forwardedHost}` : url.origin);

  // Cookies the Supabase client wants to set; copied onto whichever redirect we return.
  const pending: PendingCookie[] = [];
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list: Array<{ name: string; value: string; options?: Record<string, unknown> }>) => {
        for (const c of list) pending.push({ name: c.name, value: c.value, options: c.options });
      },
    },
  });

  const finish = (path: string) => {
    const res = NextResponse.redirect(`${base}${path}`);
    for (const c of pending) res.cookies.set(c.name, c.value, c.options);
    res.headers.set('Cache-Control', 'no-store');
    return res;
  };

  let ok = false;
  if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  } else if (tokenHash && otpType) {
    ok = !(await supabase.auth.verifyOtp({ type: otpType, token_hash: tokenHash })).error;
  }
  if (!ok) return finish(`${withLocale(locale, '/login')}?error=auth_callback`);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('family_id').eq('id', user.id).maybeSingle();
    if (!profile?.family_id) return finish(withLocale(locale, '/onboarding'));
    // Already has a family (e.g. confirmed on a second device): don't send them back to onboarding.
    if (safeNext === '/' || safeNext.endsWith('/onboarding')) return finish(withLocale(locale, '/home'));
  }
  return finish(safeNext);
}
