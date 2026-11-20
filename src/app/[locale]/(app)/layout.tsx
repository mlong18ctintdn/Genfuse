import { getTranslations } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { getFamily, getSession, isPremium } from '@/lib/session';
import { FamilyRealtimeProvider } from '@/components/providers/family-provider';
import { ActivityToasts } from '@/components/family/activity-toasts';
import { createClient } from '@/lib/supabase/server';
import type { FamilyMember } from '@/components/providers/family-provider';
import { CreditProvider } from '@/components/providers/credit-provider';
import { AppHeader } from '@/components/layout/app-header';
import { SideNav, TabBar } from '@/components/layout/app-nav';
import { UiModeSync } from '@/components/layout/ui-mode-sync';
import { FloatingCompanion } from '@/components/companion/floating-companion';
import { FuseMark } from '@/components/brand/fuse-mark';

export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { user, profile } = await getSession();
  if (!user) return redirect({ href: '/login', locale });
  if (!profile) return redirect({ href: '/onboarding', locale });

  const family = await getFamily(profile.family_id);
  if (!family) return redirect({ href: '/onboarding', locale });

  const t = await getTranslations();
  const supabase = await createClient();
  const { data: memberRows } = await supabase
    .from('profiles')
    .select('id, display_name, role')
    .order('created_at', { ascending: true });
  const members = (memberRows ?? []) as FamilyMember[];

  return (
    <CreditProvider
      familyId={family.id}
      initial={{
        premium: isPremium(family),
        credits: family.credits_remaining,
        premiumExpiresAt: family.premium_expires_at,
      }}
    >
      <FamilyRealtimeProvider familyId={family.id} meId={profile.id} meName={profile.display_name} members={members}>
      <UiModeSync mode={profile.ui_mode} />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-3 focus:text-primary-foreground"
      >
        {t('common.skipToContent')}
      </a>

      <div className="min-h-dvh md:grid md:grid-cols-[17rem_minmax(0,1fr)]">
        <aside className="sticky top-0 hidden h-dvh flex-col gap-6 overflow-y-auto border-r border-border bg-card/60 p-4 md:flex">
          <span className="flex items-center gap-2 px-2 pt-1 text-xl font-extrabold tracking-tight">
            <FuseMark size={36} />
            GENFUSE
          </span>
          <SideNav />
          <p className="mt-auto px-2 text-sm text-muted-foreground">{family.name}</p>
        </aside>

        <div className="min-w-0">
          <AppHeader profile={profile} />
          <main id="main" className="mx-auto w-full max-w-5xl px-4 py-6 pb-32 md:px-8 md:pb-12">
            {children}
          </main>
        </div>
      </div>

      <TabBar />
      <FloatingCompanion role={profile.role} displayName={profile.display_name} autoSpeak={profile.ui_mode === 'senior'} />
      <ActivityToasts />
      </FamilyRealtimeProvider>
    </CreditProvider>
  );
}
