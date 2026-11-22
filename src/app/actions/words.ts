'use server';

import { randomInt, randomUUID } from 'node:crypto';
import { generateText } from 'ai';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { canStartGame, consumeCredit, consumeGameUse, getFamilyAccess } from '@/lib/credits';
import { aiErrorCode, getChatModel, runWithFallback } from '@/lib/ai/model';
import { LANG_LABEL, type Lang } from '@/lib/ai/prompts';
import { WORD_BANK, WORD_CATEGORIES, isLetter, maskAnswer, normalizeGuess, type WordCategory } from '@/lib/games/word-bank';

type Ok<T> = { ok: true } & T;
type Err = { ok: false; error: string };

export type WordGuess = { id: string; by: string; name: string; text: string; ok: boolean; at: string };
export type WordHint = { by: string; name: string; text: string; at: string };

const MAX_AI_HINTS = 3;

async function who() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: p } = await supabase.from('profiles').select('family_id, display_name, preferred_lang').eq('id', user.id).single();
  if (!p) return null;
  return { userId: user.id, familyId: p.family_id as string, name: p.display_name as string, lang: p.preferred_lang as Lang };
}

type Row = {
  id: string;
  family_id: string;
  cells: string[];
  guesses: WordGuess[];
  hints: WordHint[];
  reveals: number;
  status: 'playing' | 'solved' | 'gave_up';
  move_count: number;
  clue: string;
  lang: Lang;
};

async function loadGame(gameId: string, familyId: string) {
  const admin = createAdminClient();
  const { data: g } = await admin.from('word_games').select('*').eq('id', gameId).eq('family_id', familyId).maybeSingle();
  if (!g) return null;
  const { data: s } = await admin.from('word_secrets').select('answer').eq('game_id', gameId).maybeSingle();
  if (!s) return null;
  return { game: g as Row, answer: s.answer as string, admin };
}

/** Optimistic write: `.eq('move_count', …)` makes two simultaneous guesses retry instead of overwriting each other. */
async function save(admin: ReturnType<typeof createAdminClient>, game: Row, patch: Record<string, unknown>) {
  const { data } = await admin
    .from('word_games')
    .update({ ...patch, move_count: game.move_count + 1, updated_at: new Date().toISOString() })
    .eq('id', game.id)
    .eq('move_count', game.move_count)
    .select('id');
  return !!data && data.length > 0;
}

/** Starts a game (spends 1 free GAME use). If the family already has one running, joins that one for free. */
export async function startWordGame(category: WordCategory): Promise<Ok<{ id: string }> | Err> {
  if (!WORD_CATEGORIES.includes(category)) return { ok: false, error: 'BAD_REQUEST' };
  const me = await who();
  if (!me) return { ok: false, error: 'UNAUTHENTICATED' };
  const admin = createAdminClient();

  const { data: running } = await admin
    .from('word_games')
    .select('id')
    .eq('family_id', me.familyId)
    .eq('status', 'playing')
    .limit(1);
  if (running && running.length > 0) return { ok: true, id: running[0].id };

  if (!(await canStartGame(me.familyId))) return { ok: false, error: 'NO_GAME_USES' };

  const bank = WORD_BANK[me.lang]?.[category] ?? WORD_BANK.vi[category];
  const puzzle = bank[randomInt(bank.length)];

  const { data: row, error } = await admin
    .from('word_games')
    .insert({
      family_id: me.familyId,
      host_id: me.userId,
      category,
      lang: me.lang,
      clue: puzzle.clue,
      cells: maskAnswer(puzzle.answer),
    })
    .select('id')
    .single();
  if (error || !row) return { ok: false, error: 'GENERIC' };

  const secret = await admin.from('word_secrets').insert({ game_id: row.id, answer: puzzle.answer });
  const spent = secret.error ? null : await consumeGameUse(me.familyId);
  if (!spent || !spent.ok) {
    await admin.from('word_games').delete().eq('id', row.id); // cascades to the secret
    return { ok: false, error: spent?.reason === 'NO_GAME_USES' ? 'NO_GAME_USES' : 'GENERIC' };
  }
  return { ok: true, id: row.id };
}

export async function guessWord(gameId: string, text: string): Promise<Ok<{ correct: boolean }> | Err> {
  const parsed = z.object({ id: z.string().uuid(), text: z.string().trim().min(1).max(80) }).safeParse({ id: gameId, text });
  if (!parsed.success) return { ok: false, error: 'BAD_REQUEST' };
  const me = await who();
  if (!me) return { ok: false, error: 'UNAUTHENTICATED' };

  for (let attempt = 0; attempt < 3; attempt++) {
    const loaded = await loadGame(parsed.data.id, me.familyId);
    if (!loaded) return { ok: false, error: 'NOT_FOUND' };
    const { game, answer, admin } = loaded;
    if (game.status !== 'playing') return { ok: false, error: 'STALE_STATE' };

    const correct = normalizeGuess(parsed.data.text) === normalizeGuess(answer);
    const guess: WordGuess = { id: randomUUID(), by: me.userId, name: me.name, text: parsed.data.text, ok: correct, at: new Date().toISOString() };
    const guesses = [...game.guesses, guess].slice(-30);
    const patch: Record<string, unknown> = { guesses };
    if (correct) Object.assign(patch, { status: 'solved', solution: answer, solved_by: me.userId, cells: [...answer] });

    if (await save(admin, game, patch)) return { ok: true, correct };
  }
  return { ok: false, error: 'STALE_STATE' };
}

/** Free hint: uncovers one more letter (never more than half of them). */
export async function revealLetter(gameId: string): Promise<Ok<object> | Err> {
  if (!z.string().uuid().safeParse(gameId).success) return { ok: false, error: 'BAD_REQUEST' };
  const me = await who();
  if (!me) return { ok: false, error: 'UNAUTHENTICATED' };

  for (let attempt = 0; attempt < 3; attempt++) {
    const loaded = await loadGame(gameId, me.familyId);
    if (!loaded) return { ok: false, error: 'NOT_FOUND' };
    const { game, answer, admin } = loaded;
    if (game.status !== 'playing') return { ok: false, error: 'STALE_STATE' };

    const chars = [...answer];
    const total = chars.filter(isLetter).length;
    const hidden = game.cells.map((c, i) => (c === '_' ? i : -1)).filter((i) => i >= 0);
    if (game.reveals >= Math.floor(total / 2) || hidden.length <= 1) return { ok: false, error: 'NO_MORE_HINTS' };

    const pick = hidden[randomInt(hidden.length)];
    const cells = [...game.cells];
    cells[pick] = chars[pick];
    if (await save(admin, game, { cells, reveals: game.reveals + 1 })) return { ok: true };
  }
  return { ok: false, error: 'STALE_STATE' };
}

/**
 * AI hint: spends 1 free AI use (premium is free), at most 3 per game.
 * The model is told the answer in the system prompt and forbidden to say it; the reply is
 * checked before it is shown, and the use is spent only after a good hint exists.
 */
export async function aiHint(gameId: string): Promise<Ok<object> | Err> {
  if (!z.string().uuid().safeParse(gameId).success) return { ok: false, error: 'BAD_REQUEST' };
  const me = await who();
  if (!me) return { ok: false, error: 'UNAUTHENTICATED' };

  const chat = getChatModel();
  if (!chat) return { ok: false, error: 'AI_NOT_CONFIGURED' };
  const access = await getFamilyAccess(me.familyId);
  if (!access) return { ok: false, error: 'NO_FAMILY' };
  if (!access.premium && access.creditsRemaining <= 0) return { ok: false, error: 'NO_CREDITS' };

  const loaded = await loadGame(gameId, me.familyId);
  if (!loaded) return { ok: false, error: 'NOT_FOUND' };
  const { game, answer, admin } = loaded;
  if (game.status !== 'playing') return { ok: false, error: 'STALE_STATE' };
  if (game.hints.length >= MAX_AI_HINTS) return { ok: false, error: 'NO_MORE_HINTS' };

  const forbidden = normalizeGuess(answer);
  const leaks = (t: string) => {
    const n = normalizeGuess(t);
    if (n.includes(forbidden)) return true;
    // also block the longest single word of a multi-word answer
    return answer
      .split(/\s+/)
      .filter((w) => normalizeGuess(w).length >= 4)
      .some((w) => n.includes(normalizeGuess(w)));
  };

  let text = '';
  try {
    for (let i = 0; i < 2 && !text; i++) {
      const { text: out } = await runWithFallback(chat, (model) =>
        generateText({
          model,
          temperature: 0.9,
          maxOutputTokens: 140,
          providerOptions: chat.provider === 'google' ? { google: { thinkingConfig: { thinkingBudget: 0 } } } : undefined,
          system: `You are the playful host of a family word-guessing game for grandparents, parents and children. Write ONLY in ${LANG_LABEL[game.lang]}.
The secret answer is: "${answer}". The existing clue shown to players is: "${game.clue}".
Give ONE new, witty, warm hint of at most 2 short sentences that helps players guess it, using a different angle than the clue (an example situation, a funny comparison, who might say it).
STRICT RULES: never write the answer, never write any of its words, never spell it, and never say how many letters it has. Output only the hint.`,
          prompt: `Hints already given: ${game.hints.map((h) => h.text).join(' | ') || 'none'}`,
        }),
      );
      const candidate = out.trim().slice(0, 300);
      if (candidate && !leaks(candidate)) text = candidate;
    }
  } catch (e) {
    console.error('[words] ai hint failed', e);
    return { ok: false, error: aiErrorCode(e) };
  }
  if (!text) return { ok: false, error: 'AI_STREAM_ERROR' };

  const hints = [...game.hints, { by: me.userId, name: me.name, text, at: new Date().toISOString() }];
  // Spend the AI use only when we are about to show the hint; if saving loses a race, nothing was charged.
  const fresh = await loadGame(gameId, me.familyId);
  if (!fresh || fresh.game.status !== 'playing') return { ok: false, error: 'STALE_STATE' };
  if (fresh.game.hints.length >= MAX_AI_HINTS) return { ok: false, error: 'NO_MORE_HINTS' };
  const paid = await consumeCredit(me.familyId);
  if (!paid.ok) return { ok: false, error: 'NO_CREDITS' };
  const next = [...fresh.game.hints, hints[hints.length - 1]].slice(0, MAX_AI_HINTS);
  if (!(await save(admin, fresh.game, { hints: next }))) {
    // Concurrent update: retry once on the newest row (the use is already spent).
    const again = await loadGame(gameId, me.familyId);
    if (again && again.game.status === 'playing') await save(admin, again.game, { hints: [...again.game.hints, hints[hints.length - 1]].slice(0, MAX_AI_HINTS) });
  }
  return { ok: true };
}

export async function giveUpWord(gameId: string): Promise<Ok<object> | Err> {
  if (!z.string().uuid().safeParse(gameId).success) return { ok: false, error: 'BAD_REQUEST' };
  const me = await who();
  if (!me) return { ok: false, error: 'UNAUTHENTICATED' };
  const loaded = await loadGame(gameId, me.familyId);
  if (!loaded) return { ok: false, error: 'NOT_FOUND' };
  const { game, answer, admin } = loaded;
  if (game.status !== 'playing') return { ok: true };
  await save(admin, game, { status: 'gave_up', solution: answer, cells: [...answer] });
  return { ok: true };
}
