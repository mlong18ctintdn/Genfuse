'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Check, Copy } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/client';
import { writeUiModeCookie, type UiMode } from '@/lib/ui-mode';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type Role = 'grandparent' | 'parent' | 'child';
type Lang = 'vi' | 'en' | 'zh' | 'es';

const ROLES: { value: Role; tone: string }[] = [
  { value: 'grandparent', tone: 'has-[:checked]:border-gran has-[:checked]:bg-gran/15' },
  { value: 'parent', tone: 'has-[:checked]:border-par has-[:checked]:bg-par/10' },
  { value: 'child', tone: 'has-[:checked]:border-kid has-[:checked]:bg-kid/10' },
];

export function OnboardingForm() {
  const t = useTranslations();
  const locale = useLocale() as Lang;
  const router = useRouter();

  const [flow, setFlow] = useState<'create' | 'join'>('create');
  const [role, setRole] = useState<Role>('parent');
  const [uiMode, setUiMode] = useState<UiMode>('standard');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function pickRole(r: Role) {
    setRole(r);
    // Grandparents most likely want the large mode: pre-select it, they can still change it.
    if (r === 'grandparent') setUiMode('senior');
  }

  function previewMode(m: UiMode) {
    setUiMode(m);
    document.documentElement.dataset.ui = m; // live preview of the size
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const displayName = String(form.get('displayName')).trim();
    setBusy(true);
    setError(null);

    const supabase = createClient();
    const common = { p_display_name: displayName, p_role: role, p_ui_mode: uiMode, p_lang: locale };

    const { data, error: rpcError } =
      flow === 'create'
        ? await supabase.rpc('create_family', { p_family_name: String(form.get('familyName')).trim(), ...common })
        : await supabase.rpc('join_family', { p_code: String(form.get('familyCode')), ...common });

    setBusy(false);

    const result = data as { ok: boolean; error?: string; family_code?: string } | null;
    if (rpcError || !result) return setError(t('errors.GENERIC'));
    if (!result.ok) return setError(t(`errors.${result.error ?? 'GENERIC'}`));

    writeUiModeCookie(uiMode);
    if (flow === 'create' && result.family_code) {
      setCreatedCode(result.family_code);
    } else {
      router.replace('/home');
      router.refresh();
    }
  }

  if (createdCode) {
    return (
      <section className="rounded-lg border border-border bg-card p-6" aria-live="polite">
        <h1 className="text-2xl font-bold">{t('onboarding.yourFamilyCode')}</h1>
        <p className="mt-6 text-5xl font-extrabold tracking-[0.25em]">{createdCode}</p>
        <p className="mt-4 text-muted-foreground">{t('onboarding.shareCode')}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={async () => {
              await navigator.clipboard.writeText(createdCode);
              setCopied(true);
            }}
          >
            {copied ? <Check /> : <Copy />}
            {copied ? t('common.copied') : t('common.copy')}
          </Button>
          <Button
            size="lg"
            onClick={() => {
              router.replace('/home');
              router.refresh();
            }}
          >
            {t('onboarding.openApp')}
          </Button>
        </div>
      </section>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-7">
      <h1 className="text-3xl font-extrabold">{t('onboarding.welcome')}</h1>

      <div role="tablist" className="inline-flex rounded-lg bg-muted p-1">
        {(['create', 'join'] as const).map((f) => (
          <button
            key={f}
            type="button"
            role="tab"
            aria-selected={flow === f}
            onClick={() => setFlow(f)}
            className={cn(
              'min-h-11 rounded-md px-4 font-semibold',
              flow === f ? 'bg-card shadow-sm' : 'text-muted-foreground',
            )}
          >
            {f === 'create' ? t('onboarding.createFamily') : t('onboarding.joinFamily')}
          </button>
        ))}
      </div>

      {error && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 font-medium text-destructive">
          {error}
        </p>
      )}

      {flow === 'create' ? (
        <div>
          <Label htmlFor="familyName">{t('onboarding.familyName')}</Label>
          <Input id="familyName" name="familyName" required maxLength={80} />
        </div>
      ) : (
        <div>
          <Label htmlFor="familyCode">{t('onboarding.familyCode')}</Label>
          <Input
            id="familyCode"
            name="familyCode"
            required
            minLength={6}
            maxLength={6}
            autoCapitalize="characters"
            autoComplete="off"
            className="max-w-48 text-xl font-bold uppercase tracking-[0.3em]"
            aria-describedby="code-hint"
          />
          <p id="code-hint" className="mt-1 text-sm text-muted-foreground">
            {t('onboarding.familyCodeHint')}
          </p>
        </div>
      )}

      <div>
        <Label htmlFor="displayName">{t('onboarding.yourName')}</Label>
        <Input id="displayName" name="displayName" required maxLength={60} autoComplete="given-name" />
      </div>

      <fieldset>
        <legend className="mb-2 font-semibold">{t('onboarding.yourRole')}</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          {ROLES.map((r) => (
            <label
              key={r.value}
              className={cn(
                'flex min-h-14 cursor-pointer items-center gap-3 rounded-lg border-2 border-input bg-card px-4 py-3 font-semibold has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-ring',
                r.tone,
              )}
            >
              <input
                type="radio"
                name="role"
                value={r.value}
                checked={role === r.value}
                onChange={() => pickRole(r.value)}
                className="size-5 accent-primary"
              />
              {t(`onboarding.roles.${r.value}`)}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 font-semibold">{t('onboarding.uiMode')}</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {(['standard', 'senior'] as const).map((m) => (
            <label
              key={m}
              className="flex cursor-pointer gap-3 rounded-lg border-2 border-input bg-card p-4 has-[:checked]:border-primary has-[:checked]:bg-accent has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-ring"
            >
              <input
                type="radio"
                name="uiMode"
                value={m}
                checked={uiMode === m}
                onChange={() => previewMode(m)}
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

      <Button type="submit" size="lg" disabled={busy} className="w-full sm:w-auto">
        {busy
          ? flow === 'create'
            ? t('onboarding.creating')
            : t('onboarding.joining')
          : flow === 'create'
            ? t('onboarding.create')
            : t('onboarding.join')}
      </Button>
    </form>
  );
}
