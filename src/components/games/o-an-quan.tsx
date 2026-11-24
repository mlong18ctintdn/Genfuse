'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowLeft, ArrowRight, DoorOpen, Plus, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { createOaqGame, endOaqGame, joinOaqGame, playOaqMove } from '@/app/actions/oaq';
import { safeErrorKey } from '@/lib/chat-utils';
import { isValidState, playMove, type Dir, type Frame, type OaqState, type Player } from '@/lib/games/o-an-quan';
import { useCredits } from '@/components/providers/credit-provider';
import { UpgradeGate } from '@/components/premium/upgrade-gate';
import { useLiveSync } from '@/lib/hooks/use-live-sync';
import { useFamily } from '@/components/providers/family-provider';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type OaqRow = {
  id: string;
  host_id: string;
  guest_id: string | null;
  state: OaqState;
  turn: number;
  move_count: number;
  status: 'waiting' | 'playing' | 'finished';
  winner: number | null;
  result: { scores?: [number, number]; quit?: boolean; by?: number } | null;
  last_move: { from: number; dir: Dir } | null;
};

const COLS = 'id, host_id, guest_id, state, turn, move_count, status, winner, result, last_move';
const STEP_MS: Record<Frame['type'], number> = { pick: 380, sow: 260, capture: 700, reseed: 800, end: 500 };

type Shown = { dan: number[]; quan: number[]; stash: OaqState['stash']; hand: number; at: number; type: Frame['type'] };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function suggestOaqMove(state: OaqState, viewer: Player, t: ReturnType<typeof useTranslations>): string {
  const mySlots = [0, 1, 2, 3, 4].map((s) => (s + 6 * viewer) % 12).filter((L) => state.dan[L] > 0);
  if (mySlots.length === 0) {
    return 'Hiện các ô dân của bạn đang hết sỏi, hệ thống sẽ tự động rải lại quân cho bạn!';
  }

  let bestScore = -1;
  let bestSlot = mySlots[0];
  let bestDir: Dir = 1;

  for (const L of mySlots) {
    for (const dir of [-1, 1] as Dir[]) {
      const sim = playMove(state, L, dir);
      if (sim.ok) {
        const gained =
          sim.state.stash[viewer].dan -
          state.stash[viewer].dan +
          (sim.state.stash[viewer].quan - state.stash[viewer].quan) * 10;
        if (gained > bestScore) {
          bestScore = gained;
          bestSlot = L;
          bestDir = dir;
        }
      }
    }
  }

  const visualPos = ((bestSlot - 6 * viewer + 12) % 12) + 1;
  const dirLabel = bestDir === 1 ? t('games.oaq.right') : t('games.oaq.left');
  if (bestScore > 0) {
    return `Bạn nên chọn ô dân số ${visualPos} (tính từ trái sang) và bấm "${dirLabel}" — nước đi này giúp bạn ăn được ${bestScore} điểm!`;
  }
  return `Bạn nên chọn ô dân số ${visualPos} (tính từ trái sang) và bấm "${dirLabel}" để rải đều sỏi và tạo thế ăn quân ở lượt sau!`;
}

function Pebbles({ n }: { n: number }) {
  const shown = Math.min(n, 12);
  return (
    <span aria-hidden className="flex max-w-full flex-wrap items-center justify-center gap-0.5">
      {Array.from({ length: shown }, (_, i) => (
        <span key={i} className="size-2 rounded-full bg-gran-ink/70 sm:size-2.5" />
      ))}
      {n > 12 && <span className="text-xs font-bold text-gran-ink">+</span>}
    </span>
  );
}

export function OAnQuan({ myId, autoSpeak }: { myId: string; autoSpeak: boolean }) {
  const t = useTranslations();
  const locale = useLocale();
  const { members, on, send, announce, connected, familyId } = useFamily();
  const supabase = useRef(createClient()).current;
  const { canPlayGame, refresh } = useCredits();

  const [rooms, setRooms] = useState<OaqRow[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [game, setGame] = useState<OaqRow | null>(null);
  const [state, setState] = useState<OaqState | null>(null);
  const [shown, setShown] = useState<Shown | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiHint, setAiHint] = useState<string | null>(null);

  const known = useRef(0);
  const stateRef = useRef<OaqState | null>(null);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const alive = useRef(true);
  const animating = useRef(false);
  const activeRef = useRef<string | null>(null);
  activeRef.current = activeId;
  stateRef.current = state;

  const nameOf = (id: string | null) => members.find((m) => m.id === id)?.display_name ?? '…';

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const loadRooms = useCallback(async () => {
    const { data } = await supabase
      .from('oaq_games')
      .select(COLS)
      .in('status', ['waiting', 'playing'])
      .order('created_at', { ascending: false })
      .limit(10);
    if (alive.current && data) setRooms(data as unknown as OaqRow[]);
  }, [supabase]);

  const reload = useCallback(async () => {
    const id = activeRef.current;
    if (!id) return;
    const { data } = await supabase.from('oaq_games').select(COLS).eq('id', id).maybeSingle();
    if (!alive.current || !data || !isValidState(data.state) || animating.current) return;
    const row = data as unknown as OaqRow;
    setGame(row);
    setState(row.state);
    setShown(null);
    setSelected(null);
    setAiHint(null);
    known.current = row.move_count;
  }, [supabase]);

  useEffect(() => {
    void loadRooms();
  }, [loadRooms]);

  const animate = useCallback(async (frames: Frame[], final: OaqState) => {
    const quick = reducedMotion();
    animating.current = true;
    for (const f of frames) {
      if (!alive.current) return;
      setShown({ dan: f.dan, quan: f.quan, stash: f.stash, hand: f.hand, at: f.at, type: f.type });
      await sleep(quick ? 0 : STEP_MS[f.type]);
    }
    animating.current = false;
    if (!alive.current) return;
    setShown(null);
    setState(final);
    setGame((g) =>
      g
        ? {
            ...g,
            move_count: known.current,
            status: final.over ? 'finished' : g.status,
            winner: final.winner,
            state: final,
            turn: final.turn,
          }
        : g,
    );
  }, []);

  const applyMove = useCallback(
    (moveNo: number, from: number, dir: Dir) => {
      if (moveNo !== known.current + 1 || !stateRef.current) return false;
      known.current = moveNo;
      setAiHint(null);
      queue.current = queue.current.then(async () => {
        const cur = stateRef.current;
        if (!cur) return;
        const r = playMove(cur, from, dir);
        if (!r.ok) return reload();
        stateRef.current = r.state;
        await animate(r.frames, r.state);
      });
      return true;
    },
    [animate, reload],
  );

  const applyRow = useCallback(
    (row: OaqRow) => {
      if (row.id !== activeRef.current || !isValidState(row.state)) return;
      if (row.move_count === known.current + 1 && row.last_move) {
        if (applyMove(row.move_count, row.last_move.from, row.last_move.dir)) return;
      }
      if (row.move_count > known.current) {
        known.current = row.move_count;
        stateRef.current = row.state;
        setGame(row);
        setState(row.state);
        setShown(null);
        setSelected(null);
        setAiHint(null);
      } else if (row.move_count === known.current && !animating.current) {
        setGame((g) =>
          g ? { ...g, status: row.status, guest_id: row.guest_id, winner: row.winner, result: row.result } : g,
        );
      }
    },
    [applyMove],
  );

  const poll = useCallback(async () => {
    if (activeRef.current) {
      const { data } = await supabase.from('oaq_games').select(COLS).eq('id', activeRef.current).maybeSingle();
      if (data) applyRow(data as unknown as OaqRow);
    } else {
      await loadRooms();
    }
  }, [supabase, applyRow, loadRooms]);

  useLiveSync<OaqRow>({
    table: 'oaq_games',
    familyId,
    onChange: (row) => {
      if (row.id === activeRef.current) applyRow(row);
      else void loadRooms();
    },
    poll,
  });

  useEffect(() => {
    const offMove = on('oaq:move', (p) => {
      if (!p || p.gameId !== activeRef.current) return;
      if (!applyMove(p.moveNo, Number(p.from), Number(p.dir) as Dir) && p.moveNo > known.current + 1) void reload();
    });
    const offUpdate = on('oaq:update', () => {
      void loadRooms();
      void reload();
    });
    const offConn = on('__connected', () => {
      void loadRooms();
      void reload();
    });
    return () => {
      offMove();
      offUpdate();
      offConn();
    };
  }, [on, applyMove, reload, loadRooms]);

  const viewer: Player = game && game.guest_id === myId ? 1 : 0;
  const isPlayer = !!game && (game.host_id === myId || game.guest_id === myId);
  const myTurn = !!game && !!state && game.status === 'playing' && isPlayer && state.turn === viewer && !shown && !busy;

  const wasMyTurn = useRef(false);
  useEffect(() => {
    if (
      autoSpeak &&
      myTurn &&
      !wasMyTurn.current &&
      typeof speechSynthesis !== 'undefined' &&
      (state?.over ?? false) === false &&
      game &&
      game.move_count > 0
    ) {
      const u = new SpeechSynthesisUtterance(t('games.oaq.yourTurn'));
      u.lang = locale === 'zh' ? 'zh-CN' : locale === 'vi' ? 'vi-VN' : locale === 'es' ? 'es-ES' : 'en-US';
      speechSynthesis.speak(u);
    }
    wasMyTurn.current = myTurn;
  }, [myTurn, autoSpeak, locale, t, state?.over, game]);

  async function open(id: string) {
    setActiveId(id);
    activeRef.current = id;
    setError(null);
    setAiHint(null);
    await reload();
  }

  async function create() {
    setError(null);
    setBusy(true);
    const res = await createOaqGame();
    setBusy(false);
    if (!res.ok) {
      void refresh();
      return setError(t(`errors.${safeErrorKey(res.error)}`));
    }
    announce('oaqRoom');
    void send('oaq:update', {});
    await loadRooms();
    await open(res.id);
  }

  async function join(id: string) {
    setError(null);
    setBusy(true);
    const res = await joinOaqGame(id);
    setBusy(false);
    if (!res.ok) {
      void loadRooms();
      void refresh();
      return setError(t(`errors.${safeErrorKey(res.error)}`));
    }
    void refresh();
    announce('oaqJoin');
    void send('oaq:update', {});
    await open(id);
    void loadRooms();
  }

  async function leave() {
    if (!game) return;
    if (game.status !== 'finished') {
      const res = await endOaqGame(game.id);
      if (!res.ok) return setError(t(`errors.${safeErrorKey(res.error)}`));
      void send('oaq:update', {});
    }
    setActiveId(null);
    setGame(null);
    setState(null);
    setAiHint(null);
    void loadRooms();
  }

  async function move(dir: Dir) {
    if (!game || !state || selected === null || !myTurn) return;
    const from = selected;
    const r = playMove(state, from, dir);
    if (!r.ok) return;
    setError(null);
    setAiHint(null);
    setSelected(null);
    setBusy(true);
    const no = known.current + 1;
    known.current = no;
    stateRef.current = r.state;
    const server = playOaqMove(game.id, from, dir, no - 1);
    const anim = animate(r.frames, r.state);
    const res = await server;
    if (!res.ok) {
      setBusy(false);
      await anim;
      setError(t(`errors.${safeErrorKey(res.error)}`));
      return reload();
    }
    await send('oaq:move', { gameId: game.id, moveNo: no, from, dir });
    await anim;
    setBusy(false);
    if (res.over) void send('oaq:update', {});
  }

  // ---------- Lobby ----------
  if (!activeId || !game || !state) {
    const mine = rooms.filter((r) => r.host_id === myId || r.guest_id === myId);
    const others = rooms.filter((r) => !mine.includes(r));
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold">{t('games.oaq.title')}</h2>
          <p className="text-muted-foreground">{t('games.oaq.subtitle')}</p>
        </div>
        {!canPlayGame && <UpgradeGate kind="game" />}
        <Button size="lg" onClick={create} disabled={!canPlayGame || busy || mine.some((r) => r.host_id === myId)}>
          <Plus aria-hidden />
          {t('games.oaq.create')}
        </Button>
        {!connected && <p className="text-sm text-muted-foreground">{t('family.connecting')}</p>}
        {error && (
          <p role="alert" className="font-medium text-destructive">
            {error}
          </p>
        )}

        {rooms.length === 0 && <p className="text-lg text-muted-foreground">{t('games.oaq.noRooms')}</p>}
        <ul className="space-y-3">
          {[...mine, ...others].map((r) => {
            const isMine = mine.includes(r);
            return (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4">
                <div>
                  <p className="text-lg font-bold">{t('games.oaq.roomOf', { name: nameOf(r.host_id) })}</p>
                  <p className="text-muted-foreground">
                    {t(`games.oaq.status.${r.status}`)}
                    {r.guest_id && ` · ${nameOf(r.guest_id)}`}
                  </p>
                </div>
                {isMine ? (
                  <Button size="lg" onClick={() => open(r.id)}>
                    {t('games.oaq.resume')}
                  </Button>
                ) : r.status === 'waiting' ? (
                  <Button size="lg" onClick={() => join(r.id)} disabled={busy || !canPlayGame}>
                    {t('games.oaq.join')}
                  </Button>
                ) : (
                  <Button size="lg" variant="outline" onClick={() => open(r.id)}>
                    {t('games.oaq.watch')}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
        <Rules />
      </div>
    );
  }

  // ---------- Waiting room ----------
  if (game.status === 'waiting') {
    return (
      <div className="space-y-5">
        <h2 className="text-xl font-bold">{t('games.oaq.roomOf', { name: nameOf(game.host_id) })}</h2>
        <p role="status" className="rounded-lg bg-gran/25 p-5 text-xl font-bold">
          {t('games.oaq.waiting')}
        </p>
        <Button variant="outline" size="lg" onClick={leave}>
          <DoorOpen aria-hidden />
          {t('games.oaq.cancelRoom')}
        </Button>
      </div>
    );
  }

  // ---------- Board ----------
  const view = shown ?? { dan: state.dan, quan: state.quan, stash: state.stash, hand: 0, at: -1, type: 'sow' as const };
  const logical = (slot: number) => (slot + 6 * viewer) % 12;
  const opp: Player = (1 - viewer) as Player;
  const youId = viewer === 0 ? game.host_id : game.guest_id;
  const oppId = viewer === 0 ? game.guest_id : game.host_id;
  const canPick = (slot: number) => myTurn && slot <= 4 && view.dan[logical(slot)] > 0;
  const over = state.over || game.status === 'finished';

  const dan = (slot: number) => {
    const L = logical(slot);
    const mineSide = slot <= 4;
    const n = view.dan[L];
    const active = view.at === L;
    return (
      <button
        key={slot}
        type="button"
        disabled={!canPick(slot)}
        onClick={() => setSelected(selected === L ? null : L)}
        aria-pressed={selected === L}
        aria-label={t('games.oaq.cellLabel', { count: n })}
        className={cn(
          'flex min-h-24 flex-col items-center justify-center gap-1 rounded-xl border-2 p-1 transition-colors disabled:cursor-default',
          mineSide ? 'border-gran-ink/40 bg-gran/35' : 'border-border bg-gran/15',
          canPick(slot) && 'cursor-pointer hover:bg-gran/60',
          selected === L && 'ring-4 ring-ring',
          active && view.type === 'capture' && 'bg-kid/30',
          active && view.type !== 'capture' && 'ring-4 ring-primary',
        )}
      >
        <span className="text-3xl font-extrabold leading-none text-foreground">{n}</span>
        <Pebbles n={n} />
      </button>
    );
  };

  const quan = (slot: number) => {
    const L = logical(slot);
    const live = view.quan[L] > 0;
    const active = view.at === L;
    return (
      <div
        className={cn(
          'row-span-2 flex flex-col items-center justify-center gap-2 rounded-[2rem] border-2 border-gran-ink/50 p-1',
          live ? 'bg-gran/55' : 'bg-muted',
          active && 'ring-4 ring-primary',
        )}
        aria-label={t('games.oaq.quanLabel', { alive: live ? 1 : 0, count: view.dan[L] })}
      >
        {live && (
          <span aria-hidden className="grid size-12 place-items-center rounded-full bg-gran-ink text-sm font-extrabold text-white">
            {t('games.oaq.quan')}
          </span>
        )}
        <span className="text-3xl font-extrabold leading-none">{view.dan[L]}</span>
        <Pebbles n={view.dan[L]} />
      </div>
    );
  };

  const stashLine = (p: Player, name: string, mine: boolean) => (
    <div className={cn('flex flex-wrap items-center justify-between gap-2 rounded-lg px-4 py-3', mine ? 'bg-kid/15' : 'bg-par/15')}>
      <span className="text-lg font-bold">
        {name}
        {mine && ` (${t('family.you')})`}
      </span>
      <span className="font-semibold">{t('games.oaq.captured', { dan: view.stash[p].dan, quan: view.stash[p].quan })}</span>
    </div>
  );

  let banner: string;
  if (over) {
    banner =
      game.result?.quit && game.winner !== null
        ? game.winner === viewer && isPlayer
          ? t('games.oaq.opponentLeft')
          : t('games.oaq.finishedBy')
        : state.winner === null
          ? t('games.oaq.draw')
          : isPlayer
            ? state.winner === viewer
              ? t('games.oaq.youWin')
              : t('games.oaq.youLose')
            : t('games.oaq.winnerIs', { name: nameOf(state.winner === 0 ? game.host_id : game.guest_id) });
  } else if (shown) {
    banner = shown.hand > 0 ? t('games.oaq.hand', { count: shown.hand }) : t(`games.oaq.step.${shown.type}`);
  } else if (!isPlayer) {
    banner = t('games.oaq.watching', { name: nameOf(state.turn === 0 ? game.host_id : game.guest_id) });
  } else if (state.turn === viewer) {
    banner = selected === null ? t('games.oaq.yourTurn') : t('games.oaq.pickDirection');
  } else {
    banner = t('games.oaq.waitFor', { name: nameOf(oppId) });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-bold">{t('games.oaq.title')}</h2>
        <Button variant="outline" onClick={leave}>
          <DoorOpen aria-hidden />
          {over ? t('games.oaq.back') : t('games.oaq.leave')}
        </Button>
      </div>

      {stashLine(opp, nameOf(oppId), false)}

      <div className="rounded-[2rem] border-4 border-gran-ink/60 bg-gran/25 p-2 sm:p-4">
        <div className="grid grid-cols-[1.25fr_repeat(5,minmax(0,1fr))_1.25fr] gap-1.5 sm:gap-2">
          {quan(11)}
          {[10, 9, 8, 7, 6].map(dan)}
          {quan(5)}
          {[0, 1, 2, 3, 4].map(dan)}
        </div>
      </div>

      {stashLine(viewer, nameOf(youId), true)}

      <div
        role="status"
        aria-live="polite"
        className={cn(
          'rounded-lg p-4 text-center text-xl font-extrabold',
          over ? 'bg-gran/30' : myTurn ? 'bg-success/15 text-success' : 'bg-muted',
        )}
      >
        {banner}
        {over && state.scores && (
          <span className="mt-1 block text-base font-semibold">
            {t('games.oaq.score', { a: state.scores[viewer], b: state.scores[opp] })}
          </span>
        )}
      </div>

      {myTurn && (
        <div className="space-y-3">
          <div className="flex justify-center">
            <Button
              type="button"
              variant="secondary"
              size="lg"
              onClick={() => setAiHint(suggestOaqMove(state, viewer, t))}
            >
              <Sparkles aria-hidden className="mr-2 size-5 text-amber-500" />
              AI gợi ý nước đi
            </Button>
          </div>

          {aiHint && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-medium text-amber-950">
              💡 <strong>Gợi ý từ AI:</strong> {aiHint}
            </div>
          )}

          {selected !== null && (
            <div className="grid grid-cols-2 gap-3">
              <Button size="lg" className="min-h-20 text-2xl" onClick={() => move(-1)}>
                <ArrowLeft aria-hidden className="!size-8" />
                {t('games.oaq.left')}
              </Button>
              <Button size="lg" className="min-h-20 text-2xl" onClick={() => move(1)}>
                {t('games.oaq.right')}
                <ArrowRight aria-hidden className="!size-8" />
              </Button>
            </div>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="font-medium text-destructive">
          {error}
        </p>
      )}
      <p className="text-sm text-muted-foreground">{t('games.oaq.viewNote')}</p>
      <Rules />
    </div>
  );
}

function Rules() {
  const t = useTranslations();
  const rules = t.raw('games.oaq.rules') as string[];
  return (
    <details className="rounded-lg border border-border bg-card p-4">
      <summary className="cursor-pointer text-lg font-bold">{t('games.oaq.rulesTitle')}</summary>
      <ol className="mt-3 list-decimal space-y-2 pl-6">
        {rules.map((r, i) => (
          <li key={i}>{r}</li>
        ))}
      </ol>
    </details>
  );
}
