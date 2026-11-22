import { getTranslations } from 'next-intl/server';
import { Settings } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { Badge, roleTone } from '@/components/ui/badge';
import { CreditBadge } from './credit-badge';
import { LanguageSwitcher } from './language-switcher';
import { FeedbackButton } from '@/components/feedback/feedback-dialog';
import { FuseMark } from '@/components/brand/fuse-mark';
import type { Profile } from '@/lib/session';

export async function AppHeader({ profile }: { profile: Profile }) {
  const t = await getTranslations();
  return (
    <header className="sticky top-0 z-30 flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border bg-background/95 px-4 py-2.5 backdrop-blur md:px-8">
      <Link href="/home" className="flex items-center gap-2 md:hidden" aria-label={t('nav.home')}>
        <FuseMark size={34} />
        <span className="text-lg font-extrabold tracking-tight">GENFUSE</span>
      </Link>

      <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
        <Badge tone={roleTone[profile.role]} className="hidden sm:inline-flex">
          {profile.display_name} · {t(`onboarding.roles.${profile.role}`)}
        </Badge>
        <CreditBadge />
        <LanguageSwitcher />
        <FeedbackButton variant="icon" />
        <Link
          href="/settings"
          aria-label={t('nav.settings')}
          className="grid size-11 place-items-center rounded-lg hover:bg-accent md:hidden"
        >
          <Settings aria-hidden className="size-5" />
        </Link>
      </div>
    </header>
  );
}
