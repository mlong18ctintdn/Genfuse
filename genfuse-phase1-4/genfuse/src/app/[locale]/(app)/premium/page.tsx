import { getTranslations } from 'next-intl/server';
import { getFamily, getSession, isPremium } from '@/lib/session';
import { PricingClient } from '@/components/premium/pricing-client';

export async function generateMetadata() {
  const t = await getTranslations();
  return { title: t('premium.title') };
}

export default async function PremiumPage({
  searchParams,
}: {
  searchParams: Promise<{ orderCode?: string; cancel?: string }>;
}) {
  const t = await getTranslations();
  const sp = await searchParams;
  const { profile } = await getSession();
  const family = profile ? await getFamily(profile.family_id) : null;

  const order = Number(sp.orderCode);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-extrabold">{t('premium.title')}</h1>
        <p className="mt-1 text-muted-foreground">{t('premium.subtitle')}</p>
      </header>
      <PricingClient
        premium={family ? isPremium(family) : false}
        premiumUntil={family && isPremium(family) ? family.premium_expires_at : null}
        returnedOrder={Number.isSafeInteger(order) && order > 0 ? order : null}
        cancelled={sp.cancel === '1'}
      />
    </div>
  );
}
