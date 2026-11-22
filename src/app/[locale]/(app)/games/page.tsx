import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/session';
import { createAdminClient } from '@/lib/supabase/admin';
import type { SpinRow, WheelChore } from '@/components/games/chore-wheel';
import type { WordRow } from '@/components/games/word-game';
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

  const readChores = () =>
    supabase.from('chore_items').select('id, title, is_exempt').order('created_at', { ascending: true }).order('id');
  const readSpins = () =>
    supabase
      .from('chore_spins')
      .select('id, spun_by, chore_title, is_exempt, assigned_name, created_at')
      .order('created_at', { ascending: false })
      .limit(20);

  let [{ data: chores }, { data: spins }, { data: wordRows }] = await Promise.all([
    readChores(),
    readSpins(),
    supabase
      .from('word_games')
      .select('id, host_id, category, clue, cells, guesses, hints, reveals, status, solution, solved_by, move_count, created_at')
      .order('created_at', { ascending: false })
      .limit(1),
  ]);

  // First visit of a family: seed the friendly defaults in the family's language.
  if ((chores?.length ?? 0) === 0 && (spins?.length ?? 0) === 0) {
    const seed = (t.raw('games.chore.defaults') as string[]).map((title) => ({
      family_id: me.family_id,
      title,
      is_exempt: false,
      created_by: null,
    }));
    seed.push({ family_id: me.family_id, title: t('games.chore.exemptDefault'), is_exempt: true, created_by: null });
    await createAdminClient().from('chore_items').insert(seed); // a concurrent seed loses on the unique index: harmless
    chores = (await readChores()).data;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold">{t('games.title')}</h1>
      <GamesClient
        familyId={me.family_id}
        myId={me.id}
        stories={(data ?? []) as Story[]}
        chores={(chores ?? []) as WheelChore[]}
        spins={(spins ?? []) as SpinRow[]}
        autoSpeak={me.ui_mode === 'senior'}
        word={((wordRows ?? [])[0] as WordRow | undefined) ?? null}
      />
    </div>
  );
}
