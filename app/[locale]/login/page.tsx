import { Link, redirect } from '@/i18n/navigation';
import { getSession } from '@/lib/session';
import { AuthForm } from '@/components/auth/auth-form';
import { FuseMark } from '@/components/brand/fuse-mark';
import { LanguageSwitcher } from '@/components/layout/language-switcher';

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ mode?: string; error?: string }>;
}) {
  const [{ locale }, sp] = await Promise.all([params, searchParams]);
  const { user, profile } = await getSession();
  if (user) redirect({ href: profile ? '/home' : '/onboarding', locale });

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-5 py-8">
      <div className="flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-xl font-extrabold tracking-tight">
          <FuseMark size={34} />
          GENFUSE
        </Link>
        <LanguageSwitcher />
      </div>
      <AuthForm initialMode={sp.mode === 'signin' ? 'signin' : 'signup'} callbackError={sp.error === 'auth_callback'} />
    </main>
  );
}
