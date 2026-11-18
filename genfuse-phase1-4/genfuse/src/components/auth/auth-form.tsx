'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { MailCheck } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/client';
import { authRedirectUrl } from '@/lib/site-url';
import { localizedPath } from '@/lib/paths';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';

export function AuthForm({ initialMode, callbackError }: { initialMode: 'signin' | 'signup'; callbackError: boolean }) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [mode, setMode] = useState(initialMode);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(callbackError ? t('auth.callbackError') : null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get('email')).trim();
    const password = String(form.get('password'));
    setBusy(true);
    setError(null);

    const supabase = createClient();

    if (mode === 'signin') {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (err) return setError(t('auth.invalidCredentials'));
      router.replace('/home');
      router.refresh();
      return;
    }

    const { data, error: err } = await supabase.auth.signUp({
      email,
      password,
      // Always the real site origin, never localhost (see src/lib/site-url.ts).
      options: { emailRedirectTo: authRedirectUrl(localizedPath(locale, '/onboarding')) },
    });
    setBusy(false);
    if (err) return setError(err.message);
    if (data.session) {
      router.replace('/onboarding');
      router.refresh();
    } else {
      setSentTo(email);
    }
  }

  if (sentTo) {
    return (
      <div role="status" className="rounded-lg border border-border bg-card p-6">
        <MailCheck aria-hidden className="mb-3 size-10 text-success" />
        <h2 className="text-2xl font-bold">{t('auth.checkEmailTitle')}</h2>
        <p className="mt-2 text-muted-foreground">{t('auth.checkEmailBody')}</p>
        <p className="mt-3 font-semibold">{sentTo}</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 rounded-lg border border-border bg-card p-6">
      <h1 className="text-2xl font-bold">{mode === 'signin' ? t('auth.signIn') : t('auth.signUp')}</h1>

      {error && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 font-medium text-destructive">
          {error}
        </p>
      )}

      <div>
        <Label htmlFor="email">{t('auth.email')}</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div>
        <Label htmlFor="password">{t('auth.password')}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          minLength={8}
          required
          autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          aria-describedby="pw-hint"
        />
        {mode === 'signup' && (
          <p id="pw-hint" className="mt-1 text-sm text-muted-foreground">
            {t('auth.passwordHint')}
          </p>
        )}
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={busy}>
        {busy ? t('common.loading') : mode === 'signin' ? t('auth.signIn') : t('auth.signUp')}
      </Button>

      <p className="text-muted-foreground">
        {mode === 'signin' ? t('auth.noAccount') : t('auth.haveAccount')}{' '}
        <button
          type="button"
          className="font-bold text-primary underline underline-offset-4"
          onClick={() => {
            setMode(mode === 'signin' ? 'signup' : 'signin');
            setError(null);
          }}
        >
          {mode === 'signin' ? t('auth.signUp') : t('auth.signIn')}
        </button>
      </p>
    </form>
  );
}
