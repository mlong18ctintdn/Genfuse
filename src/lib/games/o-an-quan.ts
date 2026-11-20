/**
 * Ô Ăn Quan: pure rules engine, shared by the server (validation) and the
 * clients (animation). No imports, no randomness, so both sides always agree.
 *
 * Ring of 12 squares, direction +1 goes "right" for both players:
 *   0..4   player 0's dân squares (host, bottom row, left to right)
 *   5      right quan square
 *   6..10  player 1's dân squares (guest, top row, right to left for player 0)
 *   11     left quan square
 *
 * Rules implemented
 * - Start: 5 dân on every dân square, 1 quan on each quan square (50 dân, 2 quan).
 * - A move picks a non-empty dân square of your own and a direction, then sows
 *   one dân per square. After the last dân:
 *     next square holds dân  -> pick them all up and keep sowing;
 *     next square is a live quan -> the turn ends;
 *     next square is empty   -> capture the square after it (if it holds dân,
 *                               or a quan with at least 5 dân on it), and keep
 *                               capturing while an empty square is followed by
 *                               a capturable square; otherwise the turn ends.
 * - A quan is worth 10 dân. A captured quan square becomes an ordinary square.
 * - If all 5 of your dân squares are empty at your turn, you put 1 dân on each
 *   (from your captured dân, else borrowed from the opponent and repaid at the end).
 *   If that is impossible the game ends.
 * - The game ends when both quan are captured (or a reseed is impossible).
 *   Remaining dân go to the owner of their side.
 */

export type Player = 0 | 1;
export type Dir = 1 | -1;
export type Stash = { dan: number; quan: number };

export type OaqState = {
  dan: number[]; // 12
  quan: number[]; // 12 (only indexes 5 and 11 can be 1)
  quanBy: number[]; // 12, -1 = none, else player who captured that quan
  stash: [Stash, Stash];
  debt: [number, number]; // dân each player borrowed from the other
  turn: Player;
  over: boolean;
  scores: [number, number] | null;
  winner: Player | null; // null while playing or on a draw
};

export type FrameType = 'pick' | 'sow' | 'capture' | 'reseed' | 'end';
export type Frame = {
  type: FrameType;
  at: number; // square the step happened on (-1 when n/a)
  hand: number; // dân still in the hand
  dan: number[];
  quan: number[];
  stash: [Stash, Stash];
};

export type Move = { from: number; dir: Dir };

export const SQUARES = 12;
export const QUAN_SQUARES = [5, 11] as const;
export const QUAN_VALUE = 10;
export const QUAN_MIN_DAN = 5;

const mod = (n: number) => ((n % SQUARES) + SQUARES) % SQUARES;

export function ownSquares(p: Player): number[] {
  return p === 0 ? [0, 1, 2, 3, 4] : [6, 7, 8, 9, 10];
}

export function newGame(): OaqState {
  const dan = Array<number>(SQUARES).fill(0);
  for (const i of [...ownSquares(0), ...ownSquares(1)]) dan[i] = 5;
  const quan = Array<number>(SQUARES).fill(0);
  quan[5] = 1;
  quan[11] = 1;
  return {
    dan,
    quan,
    quanBy: Array<number>(SQUARES).fill(-1),
    stash: [
      { dan: 0, quan: 0 },
      { dan: 0, quan: 0 },
    ],
    debt: [0, 0],
    turn: 0,
    over: false,
    scores: null,
    winner: null,
  };
}

export function cloneState(s: OaqState): OaqState {
  return {
    dan: [...s.dan],
    quan: [...s.quan],
    quanBy: [...s.quanBy],
    stash: [{ ...s.stash[0] }, { ...s.stash[1] }],
    debt: [s.debt[0], s.debt[1]],
    turn: s.turn,
    over: s.over,
    scores: s.scores ? [s.scores[0], s.scores[1]] : null,
    winner: s.winner,
  };
}

export function legalMoves(s: OaqState): Move[] {
  if (s.over) return [];
  const out: Move[] = [];
  for (const from of ownSquares(s.turn)) {
    if (s.dan[from] > 0) {
      out.push({ from, dir: 1 }, { from, dir: -1 });
    }
  }
  return out;
}

/** Total worth of one stash in dân (before debts). */
export const stashValue = (st: Stash) => st.dan + QUAN_VALUE * st.quan;

function finish(s: OaqState, stuck?: Player) {
  // Anything still on the board goes to its owner; quan squares go to whoever took
  // that quan, or (reseed impossible) to the player who is not stuck.
  for (let i = 0; i < SQUARES; i++) {
    const isQuanSq = i === 5 || i === 11;
    let owner: Player | null;
    if (isQuanSq) {
      owner = s.quanBy[i] === 0 || s.quanBy[i] === 1 ? (s.quanBy[i] as Player) : stuck === undefined ? null : ((1 - stuck) as Player);
    } else {
      owner = i <= 4 ? 0 : 1;
    }
    if (owner === null) continue;
    s.stash[owner].dan += s.dan[i];
    s.stash[owner].quan += s.quan[i];
    s.dan[i] = 0;
    s.quan[i] = 0;
  }
  const net = (p: Player) => stashValue(s.stash[p]) - s.debt[p] + s.debt[(1 - p) as Player];
  const a = net(0);
  const b = net(1);
  s.scores = [a, b];
  s.winner = a === b ? null : a > b ? 0 : 1;
  s.over = true;
}

function snap(s: OaqState, type: FrameType, at: number, hand: number): Frame {
  return {
    type,
    at,
    hand,
    dan: [...s.dan],
    quan: [...s.quan],
    stash: [{ ...s.stash[0] }, { ...s.stash[1] }],
  };
}

export type MoveResult =
  | { ok: true; state: OaqState; frames: Frame[] }
  | { ok: false; error: 'ILLEGAL_MOVE' | 'GAME_OVER' };

export function playMove(prev: OaqState, from: number, dir: Dir): MoveResult {
  if (prev.over) return { ok: false, error: 'GAME_OVER' };
  if (dir !== 1 && dir !== -1) return { ok: false, error: 'ILLEGAL_MOVE' };
  if (!Number.isInteger(from) || !ownSquares(prev.turn).includes(from) || prev.dan[from] <= 0) {
    return { ok: false, error: 'ILLEGAL_MOVE' };
  }

  const s = cloneState(prev);
  const me = s.turn;
  const frames: Frame[] = [];

  let hand = s.dan[from];
  s.dan[from] = 0;
  let pos = from;
  frames.push(snap(s, 'pick', from, hand));

  let guard = 0;
  outer: while (true) {
    while (hand > 0) {
      pos = mod(pos + dir);
      s.dan[pos] += 1;
      hand -= 1;
      frames.push(snap(s, 'sow', pos, hand));
    }
    if (++guard > 300) break; // safety net; cannot happen in normal play

    const next = mod(pos + dir);
    if (s.quan[next] > 0) break; // live quan: turn ends
    if (s.dan[next] > 0) {
      hand = s.dan[next];
      s.dan[next] = 0;
      pos = next;
      frames.push(snap(s, 'pick', next, hand));
      continue;
    }

    // Empty square: try to capture the one after it, chaining while possible.
    let empty = next;
    while (true) {
      const c = mod(empty + dir);
      const liveQuan = s.quan[c] > 0;
      if (liveQuan && s.dan[c] < QUAN_MIN_DAN) break outer;
      if (!liveQuan && s.dan[c] === 0) break outer;

      s.stash[me].dan += s.dan[c];
      s.dan[c] = 0;
      if (liveQuan) {
        s.stash[me].quan += 1;
        s.quan[c] = 0;
        s.quanBy[c] = me;
      }
      frames.push(snap(s, 'capture', c, 0));

      const n2 = mod(c + dir);
      if (s.dan[n2] === 0 && s.quan[n2] === 0) {
        empty = n2;
        continue;
      }
      break outer;
    }
  }

  // Hand the turn over.
  s.turn = (1 - me) as Player;

  if (s.quan[5] === 0 && s.quan[11] === 0) {
    finish(s);
    frames.push(snap(s, 'end', -1, 0));
    return { ok: true, state: s, frames };
  }

  const mine = ownSquares(s.turn);
  if (mine.every((i) => s.dan[i] === 0)) {
    const p = s.turn;
    const own = Math.min(s.stash[p].dan, 5);
    const borrow = 5 - own;
    const opp = (1 - p) as Player;
    if (s.stash[opp].dan < borrow) {
      finish(s, p);
      frames.push(snap(s, 'end', -1, 0));
      return { ok: true, state: s, frames };
    }
    s.stash[p].dan -= own;
    s.stash[opp].dan -= borrow;
    s.debt[p] += borrow;
    for (const i of mine) s.dan[i] = 1;
    frames.push(snap(s, 'reseed', -1, 0));
  }

  return { ok: true, state: s, frames };
}

/** Quick structural check for state loaded from the database (jsonb). */
export function isValidState(x: unknown): x is OaqState {
  if (!x || typeof x !== 'object') return false;
  const s = x as OaqState;
  const nums = (a: unknown) => Array.isArray(a) && a.length === SQUARES && a.every((n) => Number.isInteger(n) && n >= 0);
  return (
    nums(s.dan) &&
    nums(s.quan) &&
    Array.isArray(s.quanBy) &&
    s.quanBy.length === SQUARES &&
    Array.isArray(s.stash) &&
    s.stash.length === 2 &&
    s.stash.every((t) => t && Number.isInteger(t.dan) && Number.isInteger(t.quan)) &&
    Array.isArray(s.debt) &&
    s.debt.length === 2 &&
    (s.turn === 0 || s.turn === 1) &&
    typeof s.over === 'boolean'
  );
}
