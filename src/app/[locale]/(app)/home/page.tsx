import { getTranslations } from 'next-intl/server';
import { ArrowUpRight, BellRing, Gamepad2, Languages, MessageCircleHeart, ShieldAlert, TreeDeciduous, type LucideIcon } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';
import { getFamily, getSession } from '@/lib/session';
import { FamilyRoomCard } from '@/components/family/family-room-card';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Role } from '@/lib/ai/prompts';

type Feature = 'companion' | 'memoryTree' | 'translator' | 'scamShield' | 'reminders' | 'games';

const FEATURES: Record<Feature, { href: string; icon: LucideIcon }> = {
  companion: { href: '/companion', icon: MessageCircleHeart },
  memoryTree: { href: '/memory-tree', icon: TreeDeciduous },
  translator: { href: '/translator', icon: Languages },
  scamShield: { href: '/scam-shield', icon: ShieldAlert },
  reminders: { href: '/reminders', icon: BellRing },
  games: { href: '/games', icon: Gamepad2 },
};

// What each generation most likely needs first.
const ORDER: Record<Role, Feature[]> = {
  grandparent: ['companion', 'scamShield', 'memoryTree', 'reminders', 'games', 'translator'],
  parent: ['translator', 'companion', 'memoryTree', 'reminders', 'scamShield', 'games'],
  child: ['companion', 'games', 'memoryTree', 'translator', 'reminders', 'scamShield'],
};

export async function generateMetadata() {
  const t = await getTranslations();
  return { title: t('nav.home') };
}

export default async function HomePage() {
  const t = await getTranslations();
  const { profile } = await getSession();
  const me = profile!;
  const family = await getFamily(me.family_id);
  const supabase = await createClient();

  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const [{ data: due }] = await Promise.all([
    supabase
      .from('reminders')
      .select('id, title, remind_time')
      .eq('target_user_id', me.id)
      .eq('is_completed', false)
      .lte('remind_time', endOfToday.toISOString())
      .order('remind_time', { ascending: true })
      .limit(5),
  ]);

  const order = ORDER[me.role];
  const [first, ...rest] = order;
  const FirstIcon = FEATURES[first].icon;

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-extrabold md:text-4xl">{t('home.greeting', { name: me.display_name })}</h1>
      </header>

      {family && <FamilyRoomCard familyName={family.name} inviteCode={family.family_code} />}

      <section aria-labelledby="jump" className="space-y-4">
        <h2 id="jump" className="text-xl font-bold">
          {t('home.jumpIn')}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            href={FEATURES[first].href}
            className="group flex min-h-44 flex-col justify-between rounded-lg bg-primary p-6 text-primary-foreground sm:col-span-2"
          >
            <FirstIcon aria-hidden className="size-9" />
            <div>
              <p className="flex items-center gap-2 text-2xl font-extrabold">
                {t(`nav.${first}`)}
                <ArrowUpRight aria-hidden className="size-6 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </p>
              <p className="mt-1 max-w-[52ch] opacity-90">{t(`home.desc.${first}`)}</p>
            </div>
          </Link>

          {rest.map((key) => {
            const { href, icon: Icon } = FEATURES[key];
            return (
              <Link
                key={key}
                href={href}
                className="flex items-start gap-4 rounded-lg border border-border bg-card p-5 transition-colors hover:bg-accent"
              >
                <span className="grid size-12 shrink-0 place-items-center rounded-md bg-accent">
                  <Icon aria-hidden className="size-6" />
                </span>
                <span>
                  <span className="block text-lg font-bold">{t(`nav.${key}`)}</span>
                  <span className="block text-muted-foreground">{t(`home.desc.${key}`)}</span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="due" className="space-y-3">
        <h2 id="due" className="text-xl font-bold">
          {t('home.dueToday')}
        </h2>
        {due && due.length > 0 ? (
          <ul className="space-y-2">
            {due.map((r) => (
              <li key={r.id}>
                <Card className={cn('flex items-center justify-between gap-4 p-4')}>
                  <span className="font-semibold">{r.title}</span>
                  <time className="text-muted-foreground" dateTime={r.remind_time}>
                    {new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(new Date(r.remind_time))}
                  </time>
                </Card>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">{t('home.nothingDue')}</p>
        )}
      </section>
    </div>
  );
}
