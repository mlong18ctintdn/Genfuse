'use client';

import { useState, useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { LogOut } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { signOut, updateProfile } from '@/app/actions/profile';
import { writeUiModeCookie, type UiMode } from '@/lib/ui-mode';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { CopyButton } from '@/components/ui/copy-button';
import { LanguageSwitcher } from '@/components/layout/language-switcher';
import { Badge } from '@/components/ui/badge';

export function SettingsForm({
  initial,
  familyName,
  familyCode,
  premium,
}: {
  initial: { displayName: string; uiMode: UiMode };
  familyName: string;
  familyCode: string;
  premium: boolean;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initial.displayName);
  const [uiMode, setUiMode] = useState<UiMode>(initial.uiMode);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    setError(null);
    startTransition(async () => {
      const res = await updateProfile({ displayName, uiMode, lang: locale as 'vi' | 'en' | 'zh' | 'es' });
      if (!res.ok) return setError(t('errors.GENERIC'));
      writeUiModeCookie(uiMode);
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <div className="space-y-8">
      <form onSubmit={save} className="space-y-6">
        <div>
          <Label htmlFor="displayName">{t('settings.displayName')}</Label>
          <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={60} required />
        </div>

        <fieldset>
          <legend className="mb-2 font-semibold">{t('settings.uiMode')}</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {(['standard', 'senior'] as const).map((m) => (
              <label
                key={m}
                className="flex cursor-pointer gap-3 rounded-lg border-2 border-input bg-card p-4 has-[:checked]:border-primary has-[:checked]:bg-accent"
              >
                <input
                  type="radio"
                  name="uiMode"
                  checked={uiMode === m}
                  onChange={() => {
                    setUiMode(m);
                    document.documentElement.dataset.ui = m;
                  }}
                  className="mt-1 size-5 accent-primary"
                />
                <span>
                  <span className="block font-bold">{t(`onboarding.uiModes.${m}.title`)}</span>
                  <span className="block text-muted-foreground">{t(`onboarding.uiModes.${m}.desc`)}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <p className="mb-1.5 font-semibold">{t('settings.language')}</p>
          <LanguageSwitcher />
        </div>

        {error && (
          <p role="alert" className="font-medium text-destructive">
            {error}
          </p>
        )}
        <div className="flex items-center gap-3">
          <Button type="submit" size="lg" disabled={pending}>
            {t('common.save')}
          </Button>
          {saved && (
            <span role="status" className="font-semibold text-success">
              {t('settings.saved')}
            </span>
          )}
        </div>
      </form>

      <section className="space-y-2 rounded-lg border border-border bg-card p-5">
        <h2 className="text-lg font-bold">{familyName}</h2>
        <p className="flex flex-wrap items-center gap-3">
          {t('home.familyCode')}
          <strong className="text-xl tracking-[0.2em]">{familyCode}</strong>
          <CopyButton text={familyCode} size="sm" />
        </p>
        <Badge tone={premium ? 'gran' : 'neutral'}>{premium ? t('credits.premiumBadge') : t('premium.free.name')}</Badge>
      </section>

      <Button variant="outline" onClick={() => startTransition(() => signOut(locale))} disabled={pending}>
        <LogOut aria-hidden />
        {t('nav.signOut')}
      </Button>
    </div>
  );
}
