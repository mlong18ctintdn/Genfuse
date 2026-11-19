import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Landing point of the email-confirmation link (PKCE flow).
 * Always redirects back to the REAL site origin, never localhost.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/';

  // Open-redirect guard: only allow same-site relative paths.
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/';

  const forwardedHost = request.headers.get('x-forwarded-host');
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, '') ||
    (forwardedHost ? `https://${forwardedHost}` : url.origin);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${base}${safeNext}`);
  }

  return NextResponse.redirect(`${base}/login?error=auth_callback`);
}
