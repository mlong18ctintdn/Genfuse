import type { UIMessage } from 'ai';

export function messageText(m: UIMessage): string {
  return m.parts
    .filter((p): p is Extract<typeof p, { type: 'text' }> => p.type === 'text')
    .map((p) => p.text)
    .join('');
}

/** Server error bodies look like {"error":"NO_CREDITS"}; the AI SDK surfaces them as Error.message. */
export function errorCode(err: Error | undefined | null): string | null {
  if (!err) return null;
  try {
    const parsed = JSON.parse(err.message) as { error?: string };
    if (parsed.error) return parsed.error;
  } catch {
    /* not JSON */
  }
  return err.message.includes('AI_STREAM_ERROR') ? 'AI_STREAM_ERROR' : 'GENERIC';
}

const KNOWN_ERRORS = new Set([
  'BAD_REQUEST',
  'UNAUTHENTICATED',
  'NO_FAMILY',
  'NO_CREDITS',
  'RATE_LIMITED',
  'INPUT_TOO_LONG',
  'AI_NOT_CONFIGURED',
  'AI_STREAM_ERROR',
  'NEED_MEMORIES',
  'NOT_FOUND',
  'NOT_YOUR_TURN',
  'STORY_TOO_SHORT',
  'SAME_FAMILY',
  'FAMILY_CHANGE_TOO_SOON',
  'FAMILY_FULL',
  'INVALID_CODE',
  'TOO_MANY_ATTEMPTS',
  'NEED_CHORES',
  'NEED_MEMBERS',
  'SPIN_BUSY',
  'ILLEGAL_MOVE',
  'STALE_STATE',
  'ROOM_TAKEN',
  'OWN_ROOM',
  'ROOM_LIMIT',
  'CHORE_EXISTS',
  'GENERIC',
]);

/** Only codes that exist under "errors" in messages/*.json; anything else becomes GENERIC. */
export function safeErrorKey(code: string | null | undefined): string {
  return code && KNOWN_ERRORS.has(code) ? code : 'GENERIC';
}

export function toUiMessages(rows: { id: string; role: string; content: string }[]): UIMessage[] {
  return rows.map((r) => ({
    id: r.id,
    role: r.role === 'assistant' ? 'assistant' : 'user',
    parts: [{ type: 'text', text: r.content }],
  }));
}

/** Split text into [[MARKER]] sections. Tolerates a half-typed marker at the end while streaming. */
export function parseSections(raw: string, keys: string[]): Record<string, string> {
  const text = raw.replace(/\[\[[A-Z]*\]?$/, '');
  const marks = [...text.matchAll(/\[\[([A-Z]+)\]\]/g)];
  const out: Record<string, string> = {};
  marks.forEach((m, i) => {
    const key = m[1];
    const start = (m.index ?? 0) + m[0].length;
    const end = i + 1 < marks.length ? (marks[i + 1].index ?? text.length) : text.length;
    if (keys.includes(key)) out[key] = text.slice(start, end).trim();
  });
  return out;
}

export type Risk = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';

export function parseRisk(text: string): Risk | null {
  const m = text.match(/^\s*RISK:\s*(HIGH|MEDIUM|LOW|UNKNOWN)/i);
  return m ? (m[1].toUpperCase() as Risk) : null;
}

export function toBullets(s: string | undefined): string[] {
  return (s ?? '')
    .split('\n')
    .map((l) => l.replace(/^\s*[-•*]\s*/, '').trim())
    .filter(Boolean);
}
