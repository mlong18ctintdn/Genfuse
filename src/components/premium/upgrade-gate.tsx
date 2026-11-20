'use client';

import { useTranslations } from 'next-intl';
import { Crown } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';

/** Shown instead of an AI input when the family has no credits left. The server enforces the same rule. */
export function UpgradeGate({ kind = 'ai' }: { kind?: 'ai' | 'game' }) {
  const t = useTranslations();
  return (
    <div role="status" className="rounded-lg border-2 border-gran bg-gran/15 p-5">
      <h2 className="flex items-center gap-2 text-lg font-bold text-gran-ink">
        <Crown aria-hidden className="size-5" />
        {t(kind === 'game' ? 'credits.outOfGames' : 'credits.outOfCredits')}
      </h2>
      <p className="mt-1 max-w-[60ch]">{t(kind === 'game' ? 'credits.outOfGamesBody' : 'credits.outOfCreditsBody')}</p>
      <Button asChild className="mt-4">
        <Link href="/premium">{t('credits.upgradeCta')}</Link>
      </Button>
    </div>
  );
}
