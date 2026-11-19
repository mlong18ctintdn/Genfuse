import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/session';
import { GamesClient } from '@/components/games/games-client';
import type { Story } from '@/components/games/story-game';

export async function generateMetadata() {
  const t = await getTranslations();
  return { title: t('games.title') };
}

export default async function GamesPage() {
  const t = await getTranslations();
  const { profile } = await getSession();
  const me = profile!;
  const supabase = await createClient();

  const { data } = await supabase
    .from('story_games')
    .select('id, title, sentences, status, created_at')
    .order('created_at', { ascending: false })
    .limit(20);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold">{t('games.title')}</h1>
      <GamesClient familyId={me.family_id} myId={me.id} stories={(data ?? []) as Story[]} />
    </div>
  );
}
