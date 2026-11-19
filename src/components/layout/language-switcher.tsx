'use client';

import { useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Globe } from 'lucide-react';
import { usePathname, useRouter } from '@/i18n/navigation';
import { setPreferredLang } from '@/app/actions/profile';

const OPTIONS = [
  { value: 'vi', label: 'Tiếng Việt' },
  { value: 'en', label: 'English' },
  { value: 'zh', label: '简体中文' },
  { value: 'es', label: 'Español' },
] as const;

export function LanguageSwitcher({ className }: { className?: string }) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  return (
    <label className={`relative inline-flex items-center ${className ?? ''}`}>
      <span className="sr-only">{t('settings.language')}</span>
      <Globe aria-hidden className="pointer-events-none absolute left-3 size-4" />
      <select
        value={locale}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value;
          startTransition(async () => {
            await setPreferredLang(next);
            router.replace(pathname, { locale: next });
          });
        }}
        className="min-h-11 appearance-none rounded-lg border-2 border-input bg-card py-2 pl-9 pr-3 text-base font-semibold"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
