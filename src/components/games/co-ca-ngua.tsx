'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Dices, RotateCcw, Sparkles, Trophy, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';

type TeamColor = 'red' | 'blue';

interface Horse {
  id: number;
  team: TeamColor;
  steps: number; // -1: trong chuồng, 0..27: đường đua, 28..31: về chuồng đích
}

interface CaNguaState {
  turn: TeamColor;
  dice: number | null;
  hasRolled: boolean;
  horses: Horse[];
  lastLog: string;
  winner: TeamColor | null;
}

const INITIAL_HORSES: Horse[] = [
  { id: 1, team: 'red', steps: -1 },
  { id: 2, team: 'red', steps: -1 },
  { id: 3, team: 'red', steps: -1 },
  { id: 4, team: 'blue', steps: -1 },
  { id: 5, team: 'blue', steps: -1 },
  { id: 6, team: 'blue', steps: -1 },
];

const INITIAL_STATE: CaNguaState = {
  turn: 'red',
  dice: null,
  hasRolled: false,
  horses: INITIAL_HORSES,
  lastLog: 'Chào mừng cả nhà đến với Cờ Cá Ngựa! Đội Đỏ tung xúc xắc trước nhé.',
  winner: null,
};

const TRACK_LENGTH = 28;
const FINISH_TARGET = 31;

function absolutePos(horse: Horse): number | null {
  if (horse.steps < 0 || horse.steps >= TRACK_LENGTH) return null;
  const offset = horse.team === 'red' ? 0 : 14;
  return (horse.steps + offset) % TRACK_LENGTH;
}

function getAiMoveAdvice(state: CaNguaState): string {
  const myHorses = state.horses.filter((h) => h.team === state.turn);
  const enemyHorses = state.horses.filter((h) => h.team !== state.turn);
  const teamLabel = state.turn === 'red' ? 'Đội Đỏ' : 'Đội Xanh';

  if (!state.hasRolled || state.dice === null) {
    return `Bạn đang ở lượt ${teamLabel}. Hãy bấm nút "Tung xúc xắc" trước, AI sẽ tính ngay nước đi lợi nhất cho bạn!`;
  }

  const dice = state.dice;
  const movable = myHorses.filter((h) => {
    if (h.steps === -1) return dice === 6;
    return h.steps + dice <= FINISH_TARGET;
  });

  if (movable.length === 0) {
    return `Xúc xắc ra ${dice} nút nhưng hiện chưa có quân ngựa nào di chuyển được. Bạn bấm "Nhường lượt" để ván đấu tiếp tục nhé!`;
  }

  // Ưu tiên 1: Đá quân đối thủ
  for (const h of movable) {
    if (h.steps >= 0 && h.steps + dice < TRACK_LENGTH) {
      const nextStep = h.steps + dice;
      const nextAbs = (nextStep + (h.team === 'red' ? 0 : 14)) % TRACK_LENGTH;
      const targetEnemy = enemyHorses.find((e) => absolutePos(e) === nextAbs);
      if (targetEnemy) {
        return `Nước đi vàng! Bạn nên chọn Quân Ngựa #${h.id} để tiến ${dice} bước và đá văng Quân #${targetEnemy.id} của đối thủ về chuồng!`;
      }
    }
  }

  // Ưu tiên 2: Xuất quân khi đổ được 6
  const inStable = movable.find((h) => h.steps === -1);
  if (inStable && dice === 6) {
    return `Đổ được 6 nút rồi! Bạn nên chọn Quân Ngựa #${inStable.id} để xuất chuồng, vừa thêm quân trên bàn cờ vừa được thưởng thêm 1 lượt tung xúc xắc!`;
  }

  // Ưu tiên 3: Đưa quân gần đích về chuồng chiến thắng
  const closestToFinish = [...movable].sort((a, b) => b.steps - a.steps)[0];
  return `Bạn nên đi Quân Ngựa #${closestToFinish.id} (đang ở bước ${closestToFinish.steps}/${FINISH_TARGET}) để nhanh chóng đưa quân về chuồng đích an toàn nhất!`;
}

export function CoCaNguaGame({ familyId }: { familyId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [state, setState] = useState<CaNguaState>(INITIAL_STATE);
  const [aiHint, setAiHint] = useState<string>('');
  const [onlineCount, setOnlineCount] = useState<number>(1);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Tải ván cờ gần nhất từ DB + kết nối WebSocket Broadcast 0ms
  useEffect(() => {
    let mounted = true;

    async function init() {
      const { data } = await supabase
        .from('ca_ngua_games')
        .select('state')
        .eq('family_id', familyId)
        .maybeSingle();

      if (mounted && data?.state && Object.keys(data.state).length > 0) {
        setState(data.state as CaNguaState);
      }
    }
    void init();

    const channel = supabase.channel(`cangua-live-${familyId}`, {
      config: { broadcast: { self: false }, presence: { key: crypto.randomUUID() } },
    });

    channel
      .on('broadcast', { event: 'sync_state' }, ({ payload }) => {
        if (payload?.state) {
          setState(payload.state as CaNguaState);
          setAiHint('');
        }
      })
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        setOnlineCount(Math.max(1, Object.keys(presenceState).length));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    channelRef.current = channel;
    return () => {
      mounted = false;
      void supabase.removeChannel(channel);
    };
  }, [familyId, supabase]);

  // Cập nhật Optimistic UI ngay lập tức + bắn Broadcast 0ms + lưu ngầm xuống DB
  async function commitState(next: CaNguaState) {
    setState(next);
    setAiHint('');

    if (channelRef.current) {
      void channelRef.current.send({
        type: 'broadcast',
        event: 'sync_state',
        payload: { state: next },
      });
    }

    await supabase
      .from('ca_ngua_games')
      .upsert({ family_id: familyId, state: next, updated_at: new Date().toISOString() });
  }

  function rollDice() {
    if (state.hasRolled || state.winner) return;
    const dice = Math.floor(Math.random() * 6) + 1;
    const teamName = state.turn === 'red' ? 'Đội Đỏ' : 'Đội Xanh';

    const myHorses = state.horses.filter((h) => h.team === state.turn);
    const canMoveAny = myHorses.some((h) => (h.steps === -1 ? dice === 6 : h.steps + dice <= FINISH_TARGET));

    if (!canMoveAny) {
      const nextTurn: TeamColor = state.turn === 'red' ? 'blue' : 'red';
      void commitState({
        ...state,
        dice,
        hasRolled: false,
        turn: nextTurn,
        lastLog: `${teamName} tung được ${dice} nút nhưng chưa có quân đi được. Chuyển lượt sang ${nextTurn === 'red' ? 'Đội Đỏ' : 'Đội Xanh'}!`,
      });
      return;
    }

    void commitState({
      ...state,
      dice,
      hasRolled: true,
      lastLog: `${teamName} tung được ${dice} nút! Hãy chọn quân ngựa muốn di chuyển.`,
    });
  }

  function moveHorse(horseId: number) {
    if (!state.hasRolled || state.dice === null || state.winner) return;
    const target = state.horses.find((h) => h.id === horseId);
    if (!target || target.team !== state.turn) return;

    const dice = state.dice;
    if (target.steps === -1 && dice !== 6) return;
    if (target.steps >= 0 && target.steps + dice > FINISH_TARGET) return;

    const nextSteps = target.steps === -1 ? 0 : target.steps + dice;
    let kickedMsg = '';

    const updatedHorses = state.horses.map((h) => {
      if (h.id === horseId) return { ...h, steps: nextSteps };

      // Kiểm tra đá quân đối thủ trên đường đua chung
      if (h.team !== state.turn && nextSteps < TRACK_LENGTH && h.steps >= 0 && h.steps < TRACK_LENGTH) {
        const myAbs = (nextSteps + (state.turn === 'red' ? 0 : 14)) % TRACK_LENGTH;
        const enemyAbs = absolutePos(h);
        if (myAbs === enemyAbs) {
          kickedMsg = ` và đá văng Quân #${h.id} về chuồng!`;
          return { ...h, steps: -1 };
        }
      }
      return h;
    });

    const teamHorses = updatedHorses.filter((h) => h.team === state.turn);
    const hasWon = teamHorses.every((h) => h.steps >= TRACK_LENGTH);
    const teamName = state.turn === 'red' ? 'Đội Đỏ' : 'Đội Xanh';
    const nextTurn: TeamColor = dice === 6 ? state.turn : state.turn === 'red' ? 'blue' : 'red';

    void commitState({
      ...state,
      horses: updatedHorses,
      hasRolled: false,
      dice: dice === 6 ? null : dice,
      turn: hasWon ? state.turn : nextTurn,
      winner: hasWon ? state.turn : null,
      lastLog: hasWon
        ? `🎉 Chúc mừng ${teamName} đã đưa toàn bộ quân về đích và giành chiến thắng!`
        : `${teamName} di chuyển Quân #${horseId} tới bước ${nextSteps}/${FINISH_TARGET}${kickedMsg}${dice === 6 ? ' (Được thưởng thêm 1 lượt!)' : ''}`,
    });
  }

  return (
    <div className="space-y-5 rounded-2xl border-2 border-border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-extrabold">🐴 Cờ Cá Ngựa Gia Đình (Realtime)</h3>
          <p className="text-sm text-muted-foreground">
            Đồng bộ tức thì qua mạng để ông bà và con cháu cùng tung xúc xắc từ xa.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-700">
            <Users className="size-3.5" /> {onlineCount} người đang trong phòng
          </span>
          <Button variant="outline" size="sm" onClick={() => void commitState(INITIAL_STATE)}>
            <RotateCcw className="mr-1.5 size-4" /> Ván mới
          </Button>
        </div>
      </div>

      {/* Thanh trạng thái lượt chơi */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-muted/60 p-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span
              className={`inline-block size-3.5 rounded-full ${
                state.turn === 'red' ? 'bg-rose-600' : 'bg-sky-600'
              }`}
            />
            <span className="font-bold">
              Lượt hiện tại: {state.turn === 'red' ? 'Đội Đỏ (Ông / Bà)' : 'Đội Xanh (Con / Cháu)'}
            </span>
          </div>
          <p className="text-sm text-foreground/80">{state.lastLog}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="lg"
            onClick={rollDice}
            disabled={state.hasRolled || !!state.winner}
            className="font-bold"
          >
            <Dices className="mr-2 size-5" />
            {state.dice ? `Xúc xắc: ${state.dice} nút` : 'Tung xúc xắc'}
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="lg"
            onClick={() => setAiHint(getAiMoveAdvice(state))}
          >
            <Sparkles className="mr-2 size-4 text-amber-500" />
            AI gợi ý
          </Button>
        </div>
      </div>

      {aiHint && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-medium text-amber-950">
          💡 <strong>Gợi ý từ AI:</strong> {aiHint}
        </div>
      )}

      {state.winner && (
        <div className="flex items-center gap-3 rounded-xl bg-emerald-500/15 p-4 text-lg font-extrabold text-emerald-800">
          <Trophy className="size-7 text-amber-500" />
          {state.winner === 'red' ? 'Đội Đỏ chiến thắng rực rỡ!' : 'Đội Xanh chiến thắng rực rỡ!'}
        </div>
      )}

      {/* Bàn quân cờ trực quan dễ nhìn cho người cao tuổi */}
      <div className="grid gap-4 md:grid-cols-2">
        {(['red', 'blue'] as TeamColor[]).map((team) => {
          const teamHorses = state.horses.filter((h) => h.team === team);
          const isMyTurn = state.turn === team;
          return (
            <div
              key={team}
              className={`rounded-xl border-2 p-4 transition ${
                isMyTurn ? 'border-primary bg-primary/5' : 'border-border bg-background'
              }`}
            >
              <h4 className={`mb-3 font-bold ${team === 'red' ? 'text-rose-600' : 'text-sky-600'}`}>
                {team === 'red' ? '🐎 Đội Đỏ (Ông / Bà)' : '🐎 Đội Xanh (Con / Cháu)'}
              </h4>
              <div className="space-y-2.5">
                {teamHorses.map((horse) => {
                  const canMove =
                    isMyTurn &&
                    state.hasRolled &&
                    state.dice !== null &&
                    (horse.steps === -1 ? state.dice === 6 : horse.steps + state.dice <= FINISH_TARGET);

                  const progressPct =
                    horse.steps < 0 ? 0 : Math.min(100, Math.round((horse.steps / FINISH_TARGET) * 100));

                  return (
                    <div
                      key={horse.id}
                      className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3"
                    >
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between text-sm font-bold">
                          <span>Quân Ngựa #{horse.id}</span>
                          <span>
                            {horse.steps === -1
                              ? '🏠 Trong chuồng'
                              : horse.steps >= TRACK_LENGTH
                                ? `🏁 Về đích (${horse.steps}/${FINISH_TARGET})`
                                : `🛤️ Bước ${horse.steps}/${FINISH_TARGET}`}
                          </span>
                        </div>
                        <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className={`h-full transition-all duration-300 ${
                              team === 'red' ? 'bg-rose-500' : 'bg-sky-500'
                            }`}
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>

                      <Button
                        size="sm"
                        disabled={!canMove}
                        onClick={() => moveHorse(horse.id)}
                        variant={canMove ? 'default' : 'outline'}
                      >
                        Đi quân
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
