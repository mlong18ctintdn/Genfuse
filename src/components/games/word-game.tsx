'use client';

import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Eye, Flag, Lightbulb, Send, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { aiHint, giveUpWord, guessWord, revealLetter, startWordGame, type WordGuess, type WordHint } from '@/app/actions/words';
import { WORD_CATEGORIES, type WordCategory } from '@/lib/games/word-bank';
import { useLiveSync } from '@/lib/hooks/use-live-sync';
import { safeErrorKey } from '@/lib/chat-utils';
import { useCredits } from '@/components/providers/credit-provider';
import { useFamily } from '@/components/providers/family-provider';
import { UpgradeGate } from '@/components/premium/upgrade-gate';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export type WordRow = {
  id: string;
  host_id: string | null;
  category: WordCategory;
  clue: string;
  cells: string[];
  guesses: WordGuess[];
  hints: WordHint[];
  reveals: number;
  status: 'playing' | 'solved' | 'gave_up';
  solution: string | null;
  solved_by: string | null;
  move_count: number;
  created_at: string;
};

const COLS = 'id, host_id, category, clue, cells, guesses, hints, reveals, status, solution, solved_by, move_count, created_at';
const isLetterCell = (c: string) => /[\p{L}\p{N}]/u.test(c);

/** Letters are grouped into words so a word never breaks across two lines. */
function toWords(cells: string[]): string[][] {
  const words: string[][] = [[]];
  for (const c of cells) {
    if (c === ' ') words.push([]);
    else words[words.length - 1].push(c);
  }
  return words.filter((w) => w.length > 0);
}

export function WordGame({ initialGame }: { initialGame: WordRow | null }) {
  const t = useTranslations();
  const { familyId, members, meId } = useFamily();
  const { canPlayGame, canUseAi, access, refresh } = useCredits();
  const supabase = createClient();

  const [game, setGame] = useState<WordRow | null>(initialGame);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState<null | 'guess' | 'hint' | 'reveal' | 'start'>(null);
  const [error, setError] = useState<string | null>(null);

  const nameOf = (id: string | null) => members.find((m) => m.id === id)?.display_name ?? '…';

  const apply = useCallback((row: WordRow) => {
    setGame((g) => {
      if (!g) return row;
      if (row.id === g.id) return row.move_count >= g.move_count ? row : g;
      return new Date(row.created_at) >= new Date(g.created_at) ? row : g; // a newer game started
    });
  }, []);

  const poll = useCallback(async () => {
    const { data } = await supabase.from('word_games').select(COLS).order('created_at', { ascending: false }).limit(1);
    if (data && data[0]) apply(data[0] as unknown as WordRow);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apply]);

  // Realtime row changes + a 3 s poll: everybody sees guesses and hints without reloading.
  useLiveSync<WordRow>({ table: 'word_games', familyId, onChange: apply, poll });

  const fail = (code?: string) => setError(t(`errors.${safeErrorKey(code)}`));

  async function start(category: WordCategory) {
    setError(null);
    setBusy('start');
    const res = await startWordGame(category);
    setBusy(null);
    void refresh(); // header counter drops right away
    if (!res.ok) return fail(res.error);
    await poll();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!game || !text.trim()) return;
    setError(null);
    setBusy('guess');
    const res = await guessWord(game.id, text);
    setBusy(null);
    if (!res.ok) return fail(res.error);
    setText('');
    await poll();
  }

  async function reveal() {
    if (!game) return;
    setError(null);
    setBusy('reveal');
    const res = await revealLetter(game.id);
    setBusy(null);
    if (!res.ok) return fail(res.error);
    await poll();
  }

  async function hint() {
    if (!game) return;
    setError(null);
    setBusy('hint');
    const res = await aiHint(game.id);
    setBusy(null);
    void refresh(); // the AI counter drops right away
    if (!res.ok) return fail(res.error);
    await poll();
  }

  async function giveUp() {
    if (!game) return;
    const res = await giveUpWord(game.id);
    if (!res.ok) return fail(res.error);
    await poll();
  }

  const playing = game?.status === 'playing';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">{t('games.word.title')}</h2>
        <p className="text-muted-foreground">{t('games.word.subtitle')}</p>
      </div>

      {game && (
        <section className="space-y-5 rounded-lg border border-border bg-card p-5" aria-label={t('games.word.title')}>
          <p className="rounded-md bg-gran/20 p-4 text-lg font-semibold">
            <span className="block text-sm font-bold text-gran-ink">{t(`games.word.cat.${game.category}`)}</span>
            {game.clue}
          </p>

          <div role="img" aria-label={t('games.word.blanks', { count: game.cells.filter((c) => c === '_' || isLetterCell(c)).length })} className="flex flex-wrap gap-x-6 gap-y-3">
            {toWords(game.cells).map((w, wi) => (
              <span key={wi} className="inline-flex gap-1.5">
                {w.map((c, i) =>
                  c === '_' || isLetterCell(c) ? (
                    <span
                      key={i}
                      className={cn(
                        'grid size-11 place-items-center rounded-md border-2 text-2xl font-extrabold uppercase sm:size-12',
                        c === '_' ? 'border-input bg-card' : game.status === 'playing' ? 'border-primary bg-accent' : 'border-success bg-success/10 text-success',
                      )}
                    >
                      {c === '_' ? '' : c}
                    </span>
                  ) : (
                    <span key={i} className="grid h-11 place-items-center text-2xl font-extrabold sm:h-12">
                      {c}
                    </span>
                  ),
                )}
              </span>
            ))}
          </div>

          {game.hints.length > 0 && (
            <ul className="space-y-2">
              {game.hints.map((h, i) => (
                <li key={i} className="flex gap-3 rounded-md bg-par/10 p-3">
                  <Sparkles aria-hidden className="mt-0.5 size-5 shrink-0 text-par-ink" />
                  <span>
                    <span className="block text-sm font-bold text-par-ink">{t('games.word.hintBy', { name: h.name })}</span>
                    {h.text}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {playing ? (
            <>
              <form onSubmit={submit} className="space-y-2">
                <Label htmlFor="word-guess">{t('games.word.guessLabel')}</Label>
                <div className="flex gap-2">
                  <Input id="word-guess" value={text} onChange={(e) => setText(e.target.value)} maxLength={80} autoComplete="off" className="min-w-0 flex-1" />
                  <Button type="submit" size="lg" disabled={busy !== null || !text.trim()}>
                    <Send aria-hidden />
                    {t('games.word.guess')}
                  </Button>
                </div>
              </form>

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={reveal} disabled={busy !== null}>
                  <Eye aria-hidden />
                  {t('games.word.reveal')}
                </Button>
                <Button variant="secondary" onClick={hint} disabled={busy !== null || !canUseAi || game.hints.length >= 3}>
                  <Lightbulb aria-hidden />
                  {busy === 'hint' ? t('games.word.thinking') : t('games.word.aiHint')}
                  <span className="text-sm font-normal opacity-80">({t('games.word.aiCost', { left: access.premium ? '∞' : access.credits })})</span>
                </Button>
                <Button variant="ghost" onClick={giveUp} disabled={busy !== null}>
                  <Flag aria-hidden />
                  {t('games.word.giveUp')}
                </Button>
              </div>
              {!canUseAi && <UpgradeGate kind="ai" />}
            </>
          ) : (
            <div role="status" className={cn('rounded-lg p-5 text-center text-xl font-extrabold', game.status === 'solved' ? 'bg-success/15 text-success' : 'bg-muted')}>
              {game.status === 'solved'
                ? t('games.word.solved', { name: nameOf(game.solved_by), answer: game.solution ?? '' })
                : t('games.word.gaveUp', { answer: game.solution ?? '' })}
            </div>
          )}

          {game.guesses.length > 0 && (
            <div>
              <h3 className="mb-2 font-bold">{t('games.word.guesses')}</h3>
              <ul className="space-y-1.5">
                {[...game.guesses].reverse().map((g) => (
                  <li key={g.id} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
                    <span>
                      <span className="font-semibold">{g.by === meId ? t('family.you') : g.name}</span>: {g.text}
                    </span>
                    <span aria-label={g.ok ? t('games.word.right') : t('games.word.wrong')} className={g.ok ? 'font-bold text-success' : 'text-muted-foreground'}>
                      {g.ok ? '✓' : '✗'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {!playing && (
        <section className="space-y-3" aria-labelledby="word-new">
          <h3 id="word-new" className="text-lg font-bold">
            {game ? t('games.word.another') : t('games.word.pick')}
          </h3>
          {!canPlayGame && <UpgradeGate kind="game" />}
          <div className="grid gap-3 sm:grid-cols-3">
            {WORD_CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                disabled={!canPlayGame || busy !== null}
                onClick={() => start(c)}
                className="rounded-lg border-2 border-input bg-card p-4 text-left transition-colors hover:bg-accent disabled:opacity-50"
              >
                <span className="block text-lg font-bold">{t(`games.word.cat.${c}`)}</span>
                <span className="block text-muted-foreground">{t(`games.word.catDesc.${c}`)}</span>
              </button>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">{t('games.word.costNote')}</p>
        </section>
      )}

      {error && (
        <p role="alert" className="font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
