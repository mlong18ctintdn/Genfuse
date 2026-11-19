import { redirect } from '@/i18n/navigation';
import { getSession } from '@/lib/session';
import { OnboardingForm } from '@/components/onboarding/onboarding-form';
import { FuseMark } from '@/components/brand/fuse-mark';
import { LanguageSwitcher } from '@/components/layout/language-switcher';

export default async function OnboardingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const { user, profile } = await getSession();
  if (!user) redirect({ href: '/login', locale });
  if (profile) redirect({ href: '/home', locale });

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 px-5 py-8">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-xl font-extrabold tracking-tight">
          <FuseMark size={34} />
          GENFUSE
        </span>
        <LanguageSwitcher />
      </div>
      <OnboardingForm />
    </main>
  );
}
