'use client';

import { useTranslations } from 'next-intl';
import { Crown, Sparkles } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { useCredits } from '@/components/providers/credit-provider';
import { cn } from '@/lib/utils';

/** "X free uses left" in the header, live from the database via Realtime. */
export function CreditBadge() {
  const t = useTranslations();
  const { access } = useCredits();

  if (access.premium) {
    return (
      <Link
        href="/premium"
        className="inline-flex min-h-11 items-center gap-2 rounded-full bg-gran/25 px-4 text-[0.95rem] font-bold text-gran-ink"
      >
        <Crown aria-hidden className="size-4" />
        {t('credits.premiumBadge')}
      </Link>
    );
  }

  const low = access.credits <= 1 || access.gameUses <= 1;
  return (
    <Link
      href="/premium"
      aria-live="polite"
      className={cn(
        'inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-[0.95rem] font-bold',
        low ? 'bg-kid/15 text-kid-ink' : 'bg-accent text-accent-foreground',
      )}
    >
      <Sparkles aria-hidden className="size-4" />
      {t('credits.both', { ai: access.credits, games: access.gameUses })}
    </Link>
  );
}
