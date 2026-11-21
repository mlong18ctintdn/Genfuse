'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Check, HeartHandshake, Pill, Plus, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useFamily } from '@/components/providers/family-provider';
import { Badge, roleTone } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { Role } from '@/lib/ai/prompts';

export type Member = { id: string; display_name: string; role: Role };
export type Reminder = {
  id: string;
  target_user_id: string;
  created_by: string;
  title: string;
  remind_time: string;
  is_completed: boolean;
};

/** yyyy-MM-ddTHH:mm in the user's own time zone, as <input type="datetime-local"> expects. */
function localInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function tomorrowAt(hour: number) {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(hour, 0, 0, 0);
  return d;
}

export function RemindersClient({
  familyId,
  me,
  members,
  initial,
}: {
  familyId: string;
  me: Member;
  members: Member[];
  initial: Reminder[];
}) {
  const t = useTranslations();
  const locale = useLocale();
  const supabase = createClient();
  const { announce } = useFamily();

  const [items, setItems] = useState<Reminder[]>(initial);
  const [title, setTitle] = useState('');
  const [target, setTarget] = useState(me.id);
  const [when, setWhen] = useState(localInput(tomorrowAt(8)));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameOf = (id: string) => members.find((m) => m.id === id);
  const grandparents = members.filter((m) => m.role === 'grandparent' && m.id !== me.id);

  async function add(row: { title: string; target: string; when: Date }) {
    setBusy(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('reminders')
      .insert({
        family_id: familyId,
        target_user_id: row.target,
        created_by: me.id,
        title: row.title.trim(),
        remind_time: row.when.toISOString(),
      })
      .select('id, target_user_id, created_by, title, remind_time, is_completed')
      .single();
    setBusy(false);
    if (err || !data) return setError(t('errors.GENERIC'));
    setItems((prev) => [...prev, data as Reminder].sort((a, b) => a.remind_time.localeCompare(b.remind_time)));
  }

  async function toggle(r: Reminder) {
    const next = !r.is_completed;
    setItems((prev) => prev.map((x) => (x.id === r.id ? { ...x, is_completed: next } : x))); // optimistic
    const { error: err } = await supabase.from('reminders').update({ is_completed: next }).eq('id', r.id);
    if (err) {
      setItems((prev) => prev.map((x) => (x.id === r.id ? { ...x, is_completed: r.is_completed } : x)));
      setError(t('errors.GENERIC'));
      return;
    }
    if (next) announce('reminderDone');
  }

  async function remove(r: Reminder) {
    const before = items;
    setItems((prev) => prev.filter((x) => x.id !== r.id));
    const { error: err } = await supabase.from('reminders').delete().eq('id', r.id);
    if (err) {
      setItems(before);
      setError(t('errors.GENERIC'));
    }
  }

  const pending = items.filter((r) => !r.is_completed);
  const done = items.filter((r) => r.is_completed);
  const fmt = (iso: string) =>
    new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));

  return (
    <div className="space-y-8">
      {grandparents.length > 0 && me.role !== 'grandparent' && (
        <section className="space-y-3" aria-label={t('reminders.checkIn')}>
          {grandparents.map((g) => (
            <div key={g.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-gran/20 p-4">
              <p className="flex items-center gap-3 font-semibold text-gran-ink">
                <HeartHandshake aria-hidden className="size-6 shrink-0" />
                {t('reminders.checkInNudge', { name: g.display_name })}
              </p>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => add({ title: t('reminders.checkInTitle', { name: g.display_name }), target: me.id, when: tomorrowAt(18) })}
              >
                <Plus aria-hidden />
                {t('reminders.add')}
              </Button>
            </div>
          ))}
        </section>
      )}

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!title.trim() || !when) return;
          await add({ title, target, when: new Date(when) });
          setTitle('');
        }}
        className="space-y-4 rounded-lg border border-border bg-card p-5"
      >
        <h2 className="text-lg font-bold">{t('reminders.add')}</h2>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="secondary" onClick={() => setTitle(t('reminders.medication'))}>
            <Pill aria-hidden />
            {t('reminders.medication')}
          </Button>
          {grandparents[0] && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => {
                setTitle(t('reminders.checkInTitle', { name: grandparents[0].display_name }));
                setTarget(me.id);
              }}
            >
              <HeartHandshake aria-hidden />
              {t('reminders.checkIn')}
            </Button>
          )}
        </div>

        <div>
          <Label htmlFor="r-title">{t('reminders.reminderTitle')}</Label>
          <Input id="r-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} required />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="r-for">{t('reminders.forWho')}</Label>
            <select
              id="r-for"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="min-h-12 w-full rounded-lg border-2 border-input bg-card px-3 text-base"
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.display_name} ({t(`onboarding.roles.${m.role}`)})
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="r-when">{t('reminders.when')}</Label>
            <Input id="r-when" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} required />
          </div>
        </div>
        {error && (
          <p role="alert" className="font-medium text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" disabled={busy || !title.trim()}>
          {t('common.save')}
        </Button>
      </form>

      {pending.length === 0 && done.length === 0 ? (
        <p className="text-lg text-muted-foreground">{t('reminders.empty')}</p>
      ) : (
        <ul className="space-y-3">
          {pending.map((r) => (
            <ReminderRow key={r.id} r={r} nameOf={nameOf} mine={r.created_by === me.id} fmt={fmt} onToggle={toggle} onRemove={remove} />
          ))}
          {done.map((r) => (
            <ReminderRow key={r.id} r={r} nameOf={nameOf} mine={r.created_by === me.id} fmt={fmt} onToggle={toggle} onRemove={remove} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ReminderRow({
  r,
  nameOf,
  mine,
  fmt,
  onToggle,
  onRemove,
}: {
  r: Reminder;
  nameOf: (id: string) => Member | undefined;
  mine: boolean;
  fmt: (iso: string) => string;
  onToggle: (r: Reminder) => void;
  onRemove: (r: Reminder) => void;
}) {
  const t = useTranslations();
  const who = nameOf(r.target_user_id);
  const overdue = !r.is_completed && new Date(r.remind_time).getTime() < Date.now();
  return (
    <li className={cn('flex items-center gap-3 rounded-lg border border-border bg-card p-4', r.is_completed && 'opacity-60')}>
      <button
        type="button"
        role="checkbox"
        aria-checked={r.is_completed}
        aria-label={`${t('reminders.done')}: ${r.title}`}
        onClick={() => onToggle(r)}
        className={cn(
          'grid size-12 shrink-0 place-items-center rounded-full border-2',
          r.is_completed ? 'border-success bg-success text-white' : 'border-input bg-card',
        )}
      >
        {r.is_completed && <Check aria-hidden className="size-6" />}
      </button>
      <div className="min-w-0 flex-1">
        <p className={cn('text-lg font-bold', r.is_completed && 'line-through')}>{r.title}</p>
        <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <time dateTime={r.remind_time} suppressHydrationWarning>
            {fmt(r.remind_time)}
          </time>
          {who && <Badge tone={roleTone[who.role]}>{who.display_name}</Badge>}
          {overdue && <Badge tone="danger">{t('reminders.overdue')}</Badge>}
        </p>
      </div>
      {mine && (
        <Button variant="ghost" size="icon" aria-label={`${t('common.delete')}: ${r.title}`} onClick={() => onRemove(r)}>
          <Trash2 aria-hidden />
        </Button>
      )}
    </li>
  );
}
