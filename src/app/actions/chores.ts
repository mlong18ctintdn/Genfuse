'use server';

import { randomInt, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { SPIN_MS } from '@/lib/games/constants';
import { canStartGame, consumeGameUse } from '@/lib/credits';

type Ok<T> = { ok: true } & T;
type Err = { ok: false; error: string };

export type ChoreItem = { id: string; title: string; is_exempt: boolean };

export type SpinPayload = {
  spinId: string;
  chores: { id: string; title: string; exempt: boolean }[];
  index: number; // winning segment
  angle: number; // degrees clockwise from the start of segment 0, inside the winning segment
  turns: number; // full extra turns for show
  assignedId: string;
  assignedName: string;
  title: string;
  exempt: boolean;
  by: string;
  byName: string;
  at: string;
};

async function who() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from('profiles').select('family_id, display_name').eq('id', user.id).single();
  if (!profile) return null;
  return { supabase, user, profile };
}

export async function addChore(title: string): Promise<Ok<{ chore: ChoreItem }> | Err> {
  const parsed = z.string().trim().min(1).max(80).safeParse(title);
  if (!parsed.success) return { ok: false, error: 'BAD_REQUEST' };
  const me = await who();
  if (!me) return { ok: false, error: 'UNAUTHENTICATED' };

  const { data, error } = await me.supabase
    .from('chore_items')
    .insert({ family_id: me.profile.family_id, title: parsed.data, created_by: me.user.id })
    .select('id, title, is_exempt')
    .single();
  if (error || !data) {
    if (error?.code === '23505') return { ok: false, error: 'CHORE_EXISTS' };
    if (error?.message.includes('ROOM_LIMIT')) return { ok: false, error: 'ROOM_LIMIT' };
    return { ok: false, error: 'GENERIC' };
  }
  return { ok: true, chore: data as ChoreItem };
}

export async function removeChore(id: string): Promise<Ok<object> | Err> {
  if (!z.string().uuid().safeParse(id).success) return { ok: false, error: 'BAD_REQUEST' };
  const me = await who();
  if (!me) return { ok: false, error: 'UNAUTHENTICATED' };
  const { error } = await me.supabase.from('chore_items').delete().eq('id', id); // RLS: own family only
  return error ? { ok: false, error: 'GENERIC' } : { ok: true };
}

/**
 * The SERVER decides the result (so nobody can rig or race it); the client then
 * broadcasts the returned payload and every screen animates to the same spot.
 */
export async function spinChoreWheel(memberIds: string[]): Promise<Ok<{ payload: SpinPayload }> | Err> {
  const parsed = z.array(z.string().uuid()).max(30).safeParse(memberIds);
  if (!parsed.success) return { ok: false, error: 'BAD_REQUEST' };
  const me = await who();
  if (!me) return { ok: false, error: 'UNAUTHENTICATED' };

  const [{ data: chores }, { data: people }, { data: last }] = await Promise.all([
    me.supabase.from('chore_items').select('id, title, is_exempt').order('created_at', { ascending: true }).order('id'),
    me.supabase.from('profiles').select('id, display_name'),
    me.supabase.from('chore_spins').select('created_at').order('created_at', { ascending: false }).limit(1),
  ]);

  if (!chores || chores.length < 2) return { ok: false, error: 'NEED_CHORES' };
  const allowed = new Set(parsed.data);
  const pool = (people ?? []).filter((p) => allowed.has(p.id));
  if (pool.length < 1) return { ok: false, error: 'NEED_MEMBERS' };
  if (last?.[0] && Date.now() - new Date(last[0].created_at).getTime() < SPIN_MS + 500) {
    return { ok: false, error: 'SPIN_BUSY' };
  }

  if (!(await canStartGame(me.profile.family_id))) return { ok: false, error: 'NO_GAME_USES' };

  const index = randomInt(chores.length);
  const winner = chores[index];
  const person = pool[randomInt(pool.length)];
  const seg = 360 / chores.length;
  const angle = index * seg + seg / 2 + (randomInt(-35, 36) / 100) * seg;
  const turns = randomInt(4, 7);

  const spinId = randomUUID();
  const at = new Date().toISOString();
  const payload: SpinPayload = {
    spinId,
    chores: chores.map((c) => ({ id: c.id, title: c.title, exempt: c.is_exempt })),
    index,
    angle,
    turns,
    assignedId: person.id,
    assignedName: person.display_name,
    title: winner.title,
    exempt: winner.is_exempt,
    by: me.user.id,
    byName: me.profile.display_name,
    at,
  };

  // The whole spin is stored on the row: other phones replay it from the Realtime INSERT.
  const { error } = await createAdminClient().from('chore_spins').insert({
    id: spinId,
    family_id: me.profile.family_id,
    spun_by: me.user.id,
    chore_title: winner.title,
    is_exempt: winner.is_exempt,
    assigned_to: person.id,
    assigned_name: person.display_name,
    created_at: at,
    payload,
  });
  if (error) return { ok: false, error: 'GENERIC' };

  // Spend one free game use. If the family ran out in the meantime, undo the history row.
  const spent = await consumeGameUse(me.profile.family_id);
  if (!spent.ok) {
    await createAdminClient().from('chore_spins').delete().eq('id', spinId);
    return { ok: false, error: spent.reason === 'NO_GAME_USES' ? 'NO_GAME_USES' : 'GENERIC' };
  }

  return { ok: true, payload };
}
