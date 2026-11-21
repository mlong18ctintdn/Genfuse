'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Check, CircleCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CheckoutModal } from './checkout-modal';
import { usePaymentStatus } from './use-payment-status';
import type { PlanId } from '@/lib/plans';

export function PricingClient({
  premium,
  premiumUntil,
  returnedOrder,
  cancelled,
}: {
  premium: boolean;
  premiumUntil: string | null;
  /** order code from PayOS's return URL, if the customer just came back from the payment page */
  returnedOrder: number | null;
  cancelled: boolean;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const [plan, setPlan] = useState<PlanId | null>(null);
  const features = t.raw('premium.features') as string[];
  const freeFeatures = t.raw('premium.free.features') as string[];

  const returned = usePaymentStatus(returnedOrder, !!returnedOrder && !cancelled);
  const until = premiumUntil
    ? new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(new Date(premiumUntil))
    : null;

  return (
    <div className="space-y-8">
      {cancelled && (
        <p role="status" className="rounded-lg bg-muted p-4 font-semibold">
          {t('premium.cancelled')}
        </p>
      )}
      {returnedOrder && !cancelled && returned === 'pending' && (
        <p role="status" className="flex items-center gap-2 rounded-lg bg-accent p-4 font-semibold">
          <Loader2 aria-hidden className="size-5 animate-spin" />
          {t('premium.checking')}
        </p>
      )}
      {returnedOrder && returned === 'paid' && (
        <p role="status" className="flex items-center gap-2 rounded-lg bg-success/10 p-4 text-lg font-bold text-success">
          <CircleCheck aria-hidden className="size-6" />
          {t('premium.success')}
        </p>
      )}
      {premium && until && (
        <p className="rounded-lg bg-gran/20 p-4 text-lg font-bold text-gran-ink">{t('premium.currentPlan', { date: until })}</p>
      )}

      <div className="grid items-stretch gap-4 lg:grid-cols-[0.8fr_1fr_1.2fr]">
        <section className="flex flex-col rounded-lg border border-border bg-card p-6">
          <h2 className="text-xl font-bold">{t('premium.free.name')}</h2>
          <ul className="mt-4 space-y-2 text-muted-foreground">
            {freeFeatures.map((f) => (
              <li key={f} className="flex gap-2">
                <Check aria-hidden className="mt-1 size-4 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </section>

        <PlanCard
          name={t('premium.monthly.name')}
          price={t('premium.monthly.price')}
          period={t('premium.monthly.period')}
          cta={premium ? t('premium.extend') : t('premium.choose')}
          onChoose={() => setPlan('monthly')}
          features={features}
        />
        <PlanCard
          featured
          name={t('premium.yearly.name')}
          price={t('premium.yearly.price')}
          period={t('premium.yearly.period')}
          badge={t('premium.yearly.badge')}
          cta={premium ? t('premium.extend') : t('premium.choose')}
          onChoose={() => setPlan('yearly')}
          features={features}
        />
      </div>

      <CheckoutModal plan={plan} onClose={() => setPlan(null)} />
    </div>
  );
}

function PlanCard({
  name,
  price,
  period,
  badge,
  cta,
  features,
  featured,
  onChoose,
}: {
  name: string;
  price: string;
  period: string;
  badge?: string;
  cta: string;
  features: string[];
  featured?: boolean;
  onChoose: () => void;
}) {
  return (
    <section
      className={cn(
        'flex flex-col rounded-lg border p-6',
        featured ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xl font-bold">{name}</h2>
        {badge && <span className="rounded-full bg-gran px-3 py-1 text-sm font-extrabold text-foreground">{badge}</span>}
      </div>
      <p className="mt-3 text-4xl font-extrabold tracking-tight">{price}</p>
      <p className={cn('text-sm', featured ? 'opacity-80' : 'text-muted-foreground')}>{period}</p>
      <ul className="my-5 flex-1 space-y-2">
        {features.map((f) => (
          <li key={f} className="flex gap-2">
            <Check aria-hidden className="mt-1 size-4 shrink-0" />
            {f}
          </li>
        ))}
      </ul>
      <Button size="lg" variant={featured ? 'secondary' : 'default'} onClick={onChoose} className="w-full">
        {cta}
      </Button>
    </section>
  );
}
