import { getTranslations } from 'next-intl/server';
import { Link, redirect } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { FuseMark } from '@/components/brand/fuse-mark';
import { LanguageSwitcher } from '@/components/layout/language-switcher';
import { getSession } from '@/lib/session';

export default async function LandingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const { user, profile } = await getSession();
  if (user) redirect({ href: profile ? '/home' : '/onboarding', locale });

  const t = await getTranslations();

  const voices = [
    { key: 'gran', text: t('landing.gran'), bar: 'bg-gran' },
    { key: 'par', text: t('landing.par'), bar: 'bg-par' },
    { key: 'kid', text: t('landing.kid'), bar: 'bg-kid' },
  ];

  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl flex-col px-5 py-6 md:px-8">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-xl font-extrabold tracking-tight">
          <FuseMark size={36} />
          GENFUSE
        </span>
        <LanguageSwitcher />
      </div>

      <section className="grid flex-1 items-center gap-10 py-12 md:grid-cols-[1.1fr_0.9fr] md:py-20">
        <div>
          <h1 className="max-w-[18ch] text-4xl font-extrabold leading-[1.08] md:text-6xl">
            {t('meta.tagline')}
          </h1>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/login">{t('landing.cta')}</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/login?mode=signin">{t('landing.signIn')}</Link>
            </Button>
          </div>
        </div>

        <div className="flex flex-col items-start gap-8 md:items-center">
          <FuseMark size={200} animate />
          <ul className="w-full space-y-4">
            {voices.map((v) => (
              <li key={v.key} className="flex gap-3">
                <span aria-hidden className={`mt-1 w-1.5 shrink-0 self-stretch rounded-full ${v.bar}`} />
                <p className="max-w-[44ch] text-lg">{v.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
