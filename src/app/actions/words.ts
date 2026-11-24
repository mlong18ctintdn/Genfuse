'use server';

import { randomInt, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { canStartGame, consumeCredit, consumeGameUse, getFamilyAccess } from '@/lib/credits';
import type { Lang } from '@/lib/ai/prompts';
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

async function save(admin: ReturnType<typeof createAdminClient>, game: Row, patch: Record<string, unknown>) {
  const { data } = await admin
    .from('word_games')
    .update({ ...patch, move_count: game.move_count + 1, updated_at: new Date().toISOString() })
    .eq('id', game.id)
    .eq('move_count', game.move_count)
    .select('id');
  return !!data && data.length > 0;
}

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
    await admin.from('word_games').delete().eq('id', row.id);
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

/** Tạo gợi ý thông minh từ cấu trúc đáp án (không bao giờ lỗi thiếu API Key, không làm lộ từ khóa). */
function buildSmartWordHint(answer: string, hintIndex: number, lang: Lang): string {
  const words = answer.trim().split(/\s+/);
  const firstChar = words[0]?.[0]?.toUpperCase() ?? '';
  const lastChar = words[words.length - 1]?.slice(-1).toUpperCase() ?? '';

  if (lang === 'en') {
    const enHints = [
      `This phrase has ${words.length} word(s) and begins with the letter "${firstChar}". Think about everyday family life!`,
      `Look closely at the rhythm: the first word has ${words[0].length} letters and the final letter is "${lastChar}".`,
      `Almost there! Try sounding out the letters you have unlocked so far—you are very close to the answer.`,
    ];
    return enHints[hintIndex] ?? enHints[0];
  }

  const viHints = [
    `Cụm từ này gồm ${words.length} tiếng, bắt đầu bằng chữ cái "${firstChar}". Bạn hãy liên tưởng tới những điều gần gũi trong đời sống nhé!`,
    `Gợi ý thêm cho bạn: tiếng đầu tiên có ${words[0].length} chữ cái và tiếng cuối cùng kết thúc bằng chữ "${lastChar}".`,
    `Sắp ra rồi! Bạn hãy ghép vần các chữ cái đã mở trên ô trống và đọc nhẩm theo ngữ cảnh của gợi ý chính nhé.`,
  ];
  return viHints[hintIndex] ?? viHints[0];
}

export async function aiHint(gameId: string): Promise<Ok<object> | Err> {
  if (!z.string().uuid().safeParse(gameId).success) return { ok: false, error: 'BAD_REQUEST' };
  const me = await who();
  if (!me) return { ok: false, error: 'UNAUTHENTICATED' };

  const access = await getFamilyAccess(me.familyId);
  if (!access) return { ok: false, error: 'NO_FAMILY' };
  if (!access.premium && access.creditsRemaining <= 0) return { ok: false, error: 'NO_CREDITS' };

  const loaded = await loadGame(gameId, me.familyId);
  if (!loaded) return { ok: false, error: 'NOT_FOUND' };
  const { game, answer, admin } = loaded;
  if (game.status !== 'playing') return { ok: false, error: 'STALE_STATE' };
  if (game.hints.length >= MAX_AI_HINTS) return { ok: false, error: 'NO_MORE_HINTS' };

  const text = buildSmartWordHint(answer, game.hints.length, game.lang);
  const newHint: WordHint = { by: me.userId, name: me.name, text, at: new Date().toISOString() };

  const paid = await consumeCredit(me.familyId);
  if (!paid.ok) return { ok: false, error: 'NO_CREDITS' };

  const next = [...game.hints, newHint].slice(0, MAX_AI_HINTS);
  if (!(await save(admin, game, { hints: next }))) {
    const again = await loadGame(gameId, me.familyId);
    if (again && again.game.status === 'playing') {
      await save(admin, again.game, { hints: [...again.game.hints, newHint].slice(0, MAX_AI_HINTS) });
    }
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
