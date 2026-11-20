'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Plus, RotateCw, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { addChore, removeChore, spinChoreWheel, type SpinPayload } from '@/app/actions/chores';
import { SPIN_MS } from '@/lib/games/constants';
import { safeErrorKey } from '@/lib/chat-utils';
import { useFamily } from '@/components/providers/family-provider';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export type WheelChore = { id: string; title: string; is_exempt: boolean };
export type SpinRow = {
  id: string;
  spun_by: string | null;
  chore_title: string;
  is_exempt: boolean;
  assigned_name: string;
  created_at: string;
};

const PALETTE = [
  { bg: 'hsl(41 92% 62%)', fg: 'hsl(32 90% 16%)' },
  { bg: 'hsl(212 62% 42%)', fg: '#fff' },
  { bg: 'hsl(338 68% 50%)', fg: '#fff' },
  { bg: 'hsl(168 40% 30%)', fg: '#fff' },
];
const EXEMPT = { bg: 'hsl(152 62% 24%)', fg: '#fff' };

function pt(r: number, deg: number) {
  const a = (deg * Math.PI) / 180;
  return [150 + r * Math.sin(a), 150 - r * Math.cos(a)] as const;
}

function Wheel({ chores, rotation, spinning, ms }: { chores: { title: string; exempt: boolean }[]; rotation: number; spinning: boolean; ms: number }) {
  const n = chores.length;
  const seg = 360 / Math.max(n, 1);
  const font = n <= 6 ? 15 : n <= 10 ? 12 : 10;
  return (
    <div className="relative mx-auto aspect-square w-full max-w-sm select-none">
      <div
        aria-hidden
        className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1"
        style={{ width: 0, height: 0, borderLeft: '14px solid transparent', borderRight: '14px solid transparent', borderTop: '28px solid hsl(var(--foreground))' }}
      />
      <div
        className="size-full rounded-full border-4 border-foreground bg-card shadow-lg"
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: spinning ? `transform ${ms}ms cubic-bezier(0.12, 0.6, 0.1, 1)` : 'none',
        }}
      >
        <svg viewBox="0 0 300 300" className="size-full" role="img" aria-label={chores.map((c) => c.title).join(', ')}>
          {n < 2 ? (
            <circle cx="150" cy="150" r="146" fill="hsl(var(--muted))" />
          ) : (
            chores.map((c, i) => {
              const col = c.exempt ? EXEMPT : PALETTE[i % PALETTE.length];
              const [x0, y0] = pt(146, i * seg);
              const [x1, y1] = pt(146, (i + 1) * seg);
              const mid = (i + 0.5) * seg;
              const label = c.title.length > 15 ? `${c.title.slice(0, 14)}…` : c.title;
              return (
                <g key={i}>
                  <path d={`M150 150 L${x0} ${y0} A146 146 0 ${seg > 180 ? 1 : 0} 1 ${x1} ${y1} Z`} fill={col.bg} stroke="#fff" strokeWidth="2" />
                  <text
                    transform={`translate(150 150) rotate(${mid - 90}) translate(46 0)`}
                    fill={col.fg}
                    fontSize={font}
                    fontWeight="700"
                    dominantBaseline="middle"
                  >
                    {label}
                  </text>
                </g>
              );
            })
          )}
          <circle cx="150" cy="150" r="16" fill="hsl(var(--foreground))" />
        </svg>
      </div>
    </div>
  );
}

export function ChoreWheel({
  initialChores,
  initialHistory,
}: {
  initialChores: WheelChore[];
  initialHistory: SpinRow[];
}) {
  const t = useTranslations();
  const locale = useLocale();
  const { members, online, on, send, connected, announce, meId } = useFamily();

  const [chores, setChores] = useState<WheelChore[]>(initialChores);
  const [history, setHistory] = useState<SpinRow[]>(initialHistory);
  const [picked, setPicked] = useState<Set<string>>(() => new Set(members.map((m) => m.id)));
  const [title, setTitle] = useState('');
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<SpinPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ms, setMs] = useState(SPIN_MS);

  const rotRef = useRef(0);
  const lastSpin = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const supabase = useRef(createClient()).current;

  // New members appear ticked by default.
  useEffect(() => {
    setPicked((prev) => {
      const next = new Set(prev);
      members.forEach((m) => {
        if (!prev.has(m.id) && !next.has(m.id)) next.add(m.id);
      });
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members.length]);

  const reloadChores = useCallback(async () => {
    const { data } = await supabase.from('chore_items').select('id, title, is_exempt').order('created_at', { ascending: true }).order('id');
    if (data) setChores(data as WheelChore[]);
  }, [supabase]);

  const handleSpin = useCallback((p: SpinPayload) => {
    if (!p || typeof p.spinId !== 'string' || lastSpin.current === p.spinId) return;
    if (![p.index, p.angle, p.turns].every(Number.isFinite) || !Array.isArray(p.chores) || p.chores.length < 2) return;
    lastSpin.current = p.spinId;
    clearTimeout(timer.current);

    const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dur = reduced ? 300 : SPIN_MS;
    const prev = rotRef.current;
    // Land the pointer (top) on `angle`: wheel must end at (360 - angle) mod 360, after `turns` full turns.
    const delta = p.turns * 360 + ((((360 - p.angle) - (prev % 360)) % 360) + 360) % 360;
    const target = prev + delta;
    rotRef.current = target;

    setChores(p.chores.map((c) => ({ id: c.id, title: c.title, is_exempt: c.exempt })));
    setResult(null);
    setMs(dur);
    setSpinning(true);
    // Two frames so the browser applies the new chore list before the rotation starts.
    requestAnimationFrame(() => requestAnimationFrame(() => setRotation(target)));

    timer.current = setTimeout(() => {
      setSpinning(false);
      setResult(p);
      setHistory((h) =>
        [{ id: p.spinId, spun_by: p.by, chore_title: p.title, is_exempt: p.exempt, assigned_name: p.assignedName, created_at: p.at }, ...h.filter((x) => x.id !== p.spinId)].slice(0, 20),
      );
      if (p.by === meId) announce('spin', { chore: p.title, who: p.assignedName });
    }, dur + 150);
  }, [announce, meId]);

  useEffect(() => {
    const offSpin = on('wheel:spin', (p) => handleSpin(p as SpinPayload));
    const offChores = on('chores:changed', () => void reloadChores());
    return () => {
      offSpin();
      offChores();
      clearTimeout(timer.current);
    };
  }, [on, handleSpin, reloadChores]);

  async function spin() {
    setError(null);
    setBusy(true);
    const res = await spinChoreWheel([...picked]);
    setBusy(false);
    if (!res.ok) return setError(t(`errors.${safeErrorKey(res.error)}`));
    if (connected) await send('wheel:spin', res.payload as unknown as Record<string, unknown>);
    else handleSpin(res.payload);
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setError(null);
    const res = await addChore(title);
    if (!res.ok) return setError(t(`errors.${safeErrorKey(res.error)}`));
    setTitle('');
    setChores((c) => [...c, res.chore]);
    void send('chores:changed', {});
    announce('chores');
  }

  async function remove(c: WheelChore) {
    setError(null);
    const before = chores;
    setChores((x) => x.filter((y) => y.id !== c.id));
    const res = await removeChore(c.id);
    if (!res.ok) {
      setChores(before);
      return setError(t(`errors.${safeErrorKey(res.error)}`));
    }
    void send('chores:changed', {});
  }

  const toggle = (id: string) =>
    setPicked((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const fmt = (iso: string) => new Intl.DateTimeFormat(locale, { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));
  const canSpin = !spinning && !busy && chores.length >= 2 && picked.size >= 1;

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <section className="space-y-5" aria-labelledby="wheel-h">
        <div>
          <h2 id="wheel-h" className="text-xl font-bold">
            {t('games.chore.title')}
          </h2>
          <p className="text-muted-foreground">{t('games.chore.subtitle')}</p>
        </div>

        <Wheel chores={chores.map((c) => ({ title: c.title, exempt: c.is_exempt }))} rotation={rotation} spinning={spinning} ms={ms} />

        <Button size="lg" className="w-full text-xl" onClick={spin} disabled={!canSpin}>
          <RotateCw aria-hidden className={cn(spinning && 'animate-spin')} />
          {spinning ? t('games.chore.spinning') : t('games.chore.spin')}
        </Button>

        <div role="status" aria-live="polite" className="min-h-24">
          {result && !spinning && (
            <div className="rounded-lg bg-gran/25 p-5 text-center">
              <p className="text-2xl font-extrabold">
                {result.exempt
                  ? t('games.chore.exemptResult', { name: result.assignedName })
                  : t('games.chore.result', { name: result.assignedName, chore: result.title })}
              </p>
              <p className="mt-1 text-muted-foreground">{t('games.chore.spunBy', { name: result.byName })}</p>
            </div>
          )}
        </div>

        {error && (
          <p role="alert" className="font-medium text-destructive">
            {error}
          </p>
        )}
      </section>

      <div className="space-y-8">
        <section className="space-y-3" aria-labelledby="who-h">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 id="who-h" className="text-lg font-bold">
              {t('games.chore.who')}
            </h3>
            <Button size="sm" variant="ghost" onClick={() => setPicked(picked.size === members.length ? new Set() : new Set(members.map((m) => m.id)))}>
              {picked.size === members.length ? t('games.chore.none') : t('games.chore.all')}
            </Button>
          </div>
          <ul className="grid gap-2 sm:grid-cols-2">
            {members.map((m) => (
              <li key={m.id}>
                <label className="flex min-h-14 cursor-pointer items-center gap-3 rounded-lg border-2 border-input bg-card px-3 has-[:checked]:border-primary has-[:checked]:bg-accent">
                  <input type="checkbox" checked={picked.has(m.id)} onChange={() => toggle(m.id)} className="size-6 accent-primary" />
                  <span className="min-w-0 flex-1 truncate font-semibold">{m.display_name}</span>
                  <span className={online.has(m.id) ? 'text-sm font-semibold text-success' : 'text-sm text-muted-foreground'}>
                    {online.has(m.id) ? t('family.online') : t('family.offline')}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-3" aria-labelledby="list-h">
          <h3 id="list-h" className="text-lg font-bold">
            {t('games.chore.listTitle')}
          </h3>
          <form onSubmit={add} className="flex gap-2">
            <div className="min-w-0 flex-1">
              <Label htmlFor="chore-new" className="sr-only">
                {t('games.chore.addLabel')}
              </Label>
              <Input id="chore-new" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder={t('games.chore.addLabel')} />
            </div>
            <Button type="submit" size="lg" disabled={!title.trim()}>
              <Plus aria-hidden />
              {t('games.chore.add')}
            </Button>
          </form>
          <ul className="space-y-2">
            {chores.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3">
                <span className={cn('font-semibold', c.is_exempt && 'text-success')}>{c.title}</span>
                <Button variant="ghost" size="icon" aria-label={`${t('common.delete')}: ${c.title}`} onClick={() => remove(c)}>
                  <Trash2 aria-hidden />
                </Button>
              </li>
            ))}
          </ul>
          {chores.length < 2 && <p className="text-muted-foreground">{t('errors.NEED_CHORES')}</p>}
        </section>

        <section className="space-y-3" aria-labelledby="hist-h">
          <h3 id="hist-h" className="text-lg font-bold">
            {t('games.chore.history')}
          </h3>
          {history.length === 0 ? (
            <p className="text-muted-foreground">{t('games.chore.historyEmpty')}</p>
          ) : (
            <ul className="space-y-2">
              {history.map((h) => (
                <li key={h.id} className="rounded-lg border border-border bg-card p-3">
                  <p className="font-semibold">
                    {h.is_exempt
                      ? t('games.chore.exemptResult', { name: h.assigned_name })
                      : t('games.chore.result', { name: h.assigned_name, chore: h.chore_title })}
                  </p>
                  <time dateTime={h.created_at} suppressHydrationWarning className="text-sm text-muted-foreground">
                    {fmt(h.created_at)}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
