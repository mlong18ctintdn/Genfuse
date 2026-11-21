import { getTranslations } from 'next-intl/server';
import { Check, ShieldAlert, Video, Landmark, PhoneCall, X, type LucideIcon } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { getFamily, getSession, isPremium } from '@/lib/session';
import { ScamScanner } from '@/components/scam/scam-scanner';

const CARDS: { key: 'deepfake' | 'bank' | 'police'; icon: LucideIcon }[] = [
  { key: 'deepfake', icon: Video },
  { key: 'bank', icon: Landmark },
  { key: 'police', icon: PhoneCall },
];

export async function generateMetadata() {
  const t = await getTranslations();
  return { title: t('scamShield.title') };
}

export default async function ScamShieldPage() {
  const t = await getTranslations();
  const { profile } = await getSession();
  const family = profile ? await getFamily(profile.family_id) : null;
  const premium = family ? isPremium(family) : false;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-extrabold">{t('scamShield.title')}</h1>
        <p className="mt-1 max-w-[60ch] text-muted-foreground">{t('scamShield.subtitle')}</p>
        {!premium && (
          <p className="mt-2 text-sm text-muted-foreground">
            {t('scamShield.premiumNote')}{' '}
            <Link href="/premium" className="font-bold text-primary underline underline-offset-4">
              {t('nav.upgrade')}
            </Link>
          </p>
        )}
      </header>

      <ScamScanner />

      <section aria-label={t('scamShield.highAlert')} className="space-y-3">
        {CARDS.map(({ key, icon: Icon }, i) => {
          const dos = t.raw(`scamShield.cards.${key}.do`) as string[];
          const donts = t.raw(`scamShield.cards.${key}.dont`) as string[];
          return (
            // Native <details>: keyboard accessible, no JavaScript, and the first one starts open.
            <details key={key} open={i === 0} className="group rounded-lg border-2 border-destructive/60 bg-card">
              <summary className="flex min-h-16 cursor-pointer list-none items-center gap-4 p-4 [&::-webkit-details-marker]:hidden">
                <span className="grid size-12 shrink-0 place-items-center rounded-full bg-destructive/10 text-destructive">
                  <Icon aria-hidden className="size-6" />
                </span>
                <span className="flex-1">
                  <span className="flex items-center gap-2 text-sm font-bold text-destructive">
                    <ShieldAlert aria-hidden className="size-4" />
                    {t('scamShield.highAlert')}
                  </span>
                  <span className="block text-lg font-bold">{t(`scamShield.cards.${key}.title`)}</span>
                </span>
                <span aria-hidden className="text-2xl transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>

              <div className="space-y-4 px-4 pb-5">
                <p className="max-w-[60ch]">{t(`scamShield.cards.${key}.summary`)}</p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-lg bg-success/10 p-4">
                    <h2 className="font-extrabold text-success">{t('scamShield.doLabel')}</h2>
                    <ul className="mt-2 space-y-2">
                      {dos.map((d) => (
                        <li key={d} className="flex gap-2">
                          <Check aria-hidden className="mt-1 size-5 shrink-0 text-success" />
                          {d}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-lg bg-destructive/10 p-4">
                    <h2 className="font-extrabold text-destructive">{t('scamShield.dontLabel')}</h2>
                    <ul className="mt-2 space-y-2">
                      {donts.map((d) => (
                        <li key={d} className="flex gap-2">
                          <X aria-hidden className="mt-1 size-5 shrink-0 text-destructive" />
                          {d}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </details>
          );
        })}
      </section>
    </div>
  );
}
