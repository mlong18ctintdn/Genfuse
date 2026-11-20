'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { canStartGame, consumeGameUse } from '@/lib/credits';
import { isValidState, newGame, playMove, type OaqState } from '@/lib/games/o-an-quan';

type Ok<T> = { ok: true } & T;
type Err = { ok: false; error: string };

async function who() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from('profiles').select('family_id').eq('id', user.id).single();
  if (!profile) return null;
  return { user, familyId: profile.family_id as string };
}

const uuid = z.string().uuid();

export async function createOaqGame(): Promise<Ok<{ id: string }> | Err> {
  const me = await who();
  if (!me) return { ok: false, error: 'UNAUTHENTICATED' };
  if (!(await canStartGame(me.familyId))) return { ok: false, error: 'NO_GAME_USES' };
  const admin = createAdminClient();

  const { data: open } = await admin
    .from('oaq_games')
    .select('id, host_id')
    .eq('family_id', me.familyId)
    .in('status', ['waiting', 'playing']);
  if ((open ?? []).some((g) => g.host_id === me.user.id) || (open ?? []).length >= 8) {
    return { ok: false, error: 'ROOM_LIMIT' };
  }

  const { data, error } = await admin
    .from('oaq_games')
    .insert({ family_id: me.familyId, host_id: me.user.id, state: newGame(), turn: 0 })
    .select('id')
    .single();
  if (error || !data) return { ok: false, error: 'GENERIC' };
  return { ok: true, id: data.id };
}

export async function joinOaqGame(gameId: string): Promise<Ok<object> | Err> {
  if (!uuid.safeParse(gameId).success) return { ok: false, error: 'BAD_REQUEST' };
  const me = await who();
  if (!me) return { ok: false, error: 'UNAUTHENTICATED' };
  const admin = createAdminClient();

  const { data: g } = await admin.from('oaq_games').select('id, host_id, guest_id, status').eq('id', gameId).eq('family_id', me.familyId).maybeSingle();
  if (!g) return { ok: false, error: 'NOT_FOUND' };
  if (g.host_id === me.user.id) return { ok: false, error: 'OWN_ROOM' };
  if (!(await canStartGame(me.familyId))) return { ok: false, error: 'NO_GAME_USES' };

  // Atomic: only succeeds while the seat is still free.
  const { data: updated } = await admin
    .from('oaq_games')
    .update({ guest_id: me.user.id, status: 'playing', updated_at: new Date().toISOString() })
    .eq('id', gameId)
    .eq('family_id', me.familyId)
    .eq('status', 'waiting')
    .is('guest_id', null)
    .select('id');
  if (!updated || updated.length === 0) return { ok: false, error: 'ROOM_TAKEN' };

  // The game starts now: spend one free game use (the family shares the pool).
  const spent = await consumeGameUse(me.familyId);
  if (!spent.ok) {
    await admin
      .from('oaq_games')
      .update({ guest_id: null, status: 'waiting', updated_at: new Date().toISOString() })
      .eq('id', gameId)
      .eq('guest_id', me.user.id);
    return { ok: false, error: spent.reason === 'NO_GAME_USES' ? 'NO_GAME_USES' : 'GENERIC' };
  }
  return { ok: true };
}

/** Cancel a waiting room, or leave a running game (the other player wins). */
export async function endOaqGame(gameId: string): Promise<Ok<object> | Err> {
  if (!uuid.safeParse(gameId).success) return { ok: false, error: 'BAD_REQUEST' };
  const me = await who();
  if (!me) return { ok: false, error: 'UNAUTHENTICATED' };
  const admin = createAdminClient();

  const { data: g } = await admin.from('oaq_games').select('id, host_id, guest_id, status').eq('id', gameId).eq('family_id', me.familyId).maybeSingle();
  if (!g) return { ok: false, error: 'NOT_FOUND' };
  if (g.status === 'finished') return { ok: true };
  const idx = g.host_id === me.user.id ? 0 : g.guest_id === me.user.id ? 1 : -1;
  if (idx < 0) return { ok: false, error: 'NOT_FOUND' };

  const winner = g.status === 'playing' ? 1 - idx : null;
  const { error } = await admin
    .from('oaq_games')
    .update({ status: 'finished', winner, result: { quit: true, by: idx }, updated_at: new Date().toISOString() })
    .eq('id', gameId)
    .neq('status', 'finished');
  return error ? { ok: false, error: 'GENERIC' } : { ok: true };
}

/**
 * The server runs the same rules engine, so a modified client cannot cheat.
 * `expectedMoveNo` + the `.eq('move_count', …)` guard make a double-tap or a
 * stale screen fail instead of playing twice.
 */
export async function playOaqMove(
  gameId: string,
  from: number,
  dir: number,
  expectedMoveNo: number,
): Promise<Ok<{ moveNo: number; over: boolean }> | Err> {
  const parsed = z
    .object({ id: uuid, from: z.number().int().min(0).max(11), dir: z.union([z.literal(1), z.literal(-1)]), n: z.number().int().min(0) })
    .safeParse({ id: gameId, from, dir, n: expectedMoveNo });
  if (!parsed.success) return { ok: false, error: 'BAD_REQUEST' };
  const me = await who();
  if (!me) return { ok: false, error: 'UNAUTHENTICATED' };
  const admin = createAdminClient();

  const { data: g } = await admin.from('oaq_games').select('*').eq('id', parsed.data.id).eq('family_id', me.familyId).maybeSingle();
  if (!g) return { ok: false, error: 'NOT_FOUND' };
  if (g.status !== 'playing') return { ok: false, error: 'STALE_STATE' };
  const idx = g.host_id === me.user.id ? 0 : g.guest_id === me.user.id ? 1 : -1;
  if (idx < 0) return { ok: false, error: 'NOT_FOUND' };
  if (g.move_count !== parsed.data.n) return { ok: false, error: 'STALE_STATE' };
  if (!isValidState(g.state)) return { ok: false, error: 'GENERIC' };
  const state = g.state as OaqState;
  if (state.turn !== idx) return { ok: false, error: 'NOT_YOUR_TURN' };

  const res = playMove(state, parsed.data.from, parsed.data.dir);
  if (!res.ok) return { ok: false, error: 'ILLEGAL_MOVE' };
  const next = res.state;

  const { data: updated } = await admin
    .from('oaq_games')
    .update({
      state: next,
      turn: next.turn,
      move_count: g.move_count + 1,
      status: next.over ? 'finished' : 'playing',
      winner: next.over ? next.winner : null,
      result: next.over ? { scores: next.scores } : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', g.id)
    .eq('move_count', g.move_count)
    .select('id');
  if (!updated || updated.length === 0) return { ok: false, error: 'STALE_STATE' };
  return { ok: true, moveNo: g.move_count + 1, over: next.over };
}
