'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export type StorySentence = {
  author_id: string | null;
  name: string;
  role?: 'grandparent' | 'parent' | 'child';
  kind: 'player' | 'narrator';
  text: string;
};

type Ok<T> = { ok: true } & T;
type Err = { ok: false; error: string };

async function who() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from('profiles')
    .select('family_id, display_name, role')
    .eq('id', user.id)
    .single();
  if (!profile) return null;
  return { supabase, user, profile };
}

export async function startStory(title: string): Promise<Ok<{ id: string }> | Err> {
  const parsed = z.string().trim().min(1).max(120).safeParse(title);
  if (!parsed.success) return { ok: false, error: 'BAD_REQUEST' };
  const me = await who();
  if (!me) return { ok: false, error: 'UNAUTHENTICATED' };

  const { data, error } = await me.supabase
    .from('story_games')
    .insert({ family_id: me.profile.family_id, created_by: me.user.id, title: parsed.data })
    .select('id')
    .single();
  if (error || !data) return { ok: false, error: 'GENERIC' };
  return { ok: true, id: data.id };
}

/**
 * Adds one player sentence. Turn order is enforced here (you cannot add two in
 * a row; the narrator's line hands the turn back), and the write itself is an
 * atomic jsonb append in SQL, so two players can never overwrite each other.
 */
export async function addSentence(
  storyId: string,
  text: string,
): Promise<Ok<{ sentences: StorySentence[] }> | Err> {
  const parsed = z.object({ id: z.string().uuid(), text: z.string().trim().min(1).max(300) }).safeParse({ id: storyId, text });
  if (!parsed.success) return { ok: false, error: 'BAD_REQUEST' };
  const me = await who();
  if (!me) return { ok: false, error: 'UNAUTHENTICATED' };

  // RLS guarantees this story belongs to the caller's family.
  const { data: story } = await me.supabase.from('story_games').select('id, sentences, status').eq('id', parsed.data.id).single();
  if (!story || story.status !== 'open') return { ok: false, error: 'NOT_FOUND' };

  const sentences = story.sentences as StorySentence[];
  const last = sentences[sentences.length - 1];
  if (last && last.kind === 'player' && last.author_id === me.user.id) return { ok: false, error: 'NOT_YOUR_TURN' };

  const entry: StorySentence = {
    author_id: me.user.id,
    name: me.profile.display_name,
    role: me.profile.role,
    kind: 'player',
    text: parsed.data.text,
  };
  const { data, error } = await createAdminClient().rpc('append_story_sentence', {
    p_story_id: story.id,
    p_family_id: me.profile.family_id,
    p_sentence: entry,
  });
  if (error || !data) return { ok: false, error: 'GENERIC' };
  return { ok: true, sentences: data as StorySentence[] };
}
