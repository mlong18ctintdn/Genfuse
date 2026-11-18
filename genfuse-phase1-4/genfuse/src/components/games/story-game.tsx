'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { BookOpen, Plus, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { addSentence, startStory, type StorySentence } from '@/app/actions/story';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UpgradeGate } from '@/components/premium/upgrade-gate';
import { useCredits } from '@/components/providers/credit-provider';
import { safeErrorKey } from '@/lib/chat-utils';
import { cn } from '@/lib/utils';

export type Story = { id: string; title: string; sentences: StorySentence[]; status: string; created_at: string };

const UNDERLINE = { grandparent: 'decoration-gran', parent: 'decoration-par', child: 'decoration-kid' } as const;

export function StoryGame({ familyId, myId, initial }: { familyId: string; myId: string; initial: Story[] }) {
  const t = useTranslations();
  const { refresh, canUseAi } = useCredits();
  const [stories, setStories] = useState<Story[]>(initial);
  const [openId, setOpenId] = useState<string | null>(initial[0]?.id ?? null);
  const [newTitle, setNewTitle] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Everyone in the family sees new sentences as they are written.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`stories-${familyId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'story_games', filter: `family_id=eq.${familyId}` }, (p) => {
        const row = p.new as Story;
        if (!row?.id) return;
        setStories((prev) => (prev.some((s) => s.id === row.id) ? prev.map((s) => (s.id === row.id ? row : s)) : [row, ...prev]));
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [familyId]);

  const story = stories.find((s) => s.id === openId) ?? null;
  const last = story?.sentences[story.sentences.length - 1];
  const myTurn = !last || last.kind === 'narrator' || last.author_id !== myId;
  const canNarrate = !!story && story.sentences.length >= 2 && last?.kind !== 'narrator';

  function setSentences(id: string, sentences: StorySentence[]) {
    setStories((prev) => prev.map((s) => (s.id === id ? { ...s, sentences } : s)));
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setBusy(true);
    setError(null);
    const res = await startStory(newTitle);
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setStories((prev) => [{ id: res.id, title: newTitle.trim(), sentences: [], status: 'open', created_at: new Date().toISOString() }, ...prev]);
    setOpenId(res.id);
    setNewTitle('');
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!story || !text.trim()) return;
    setBusy(true);
    setError(null);
    const res = await addSentence(story.id, text);
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setSentences(story.id, res.sentences);
    setText('');
  }

  async function narrate() {
    if (!story) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/story/narrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyId: story.id }),
      });
      const body = (await res.json()) as { sentences?: StorySentence[]; error?: string };
      if (!res.ok || !body.sentences) setError(body.error ?? 'GENERIC');
      else {
        setSentences(story.id, body.sentences);
        void refresh();
      }
    } catch {
      setError('GENERIC');
    }
    setBusy(false);
  }

  const errorText = error ? t(`errors.${safeErrorKey(error)}`) : null;

  return (
    <div className="grid gap-6 md:grid-cols-[16rem_minmax(0,1fr)]">
      <div className="space-y-4">
        <form onSubmit={create} className="space-y-2">
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder={t('games.story.titleLabel')}
            aria-label={t('games.story.titleLabel')}
            maxLength={120}
          />
          <Button type="submit" className="w-full" disabled={busy || !newTitle.trim()}>
            <Plus aria-hidden />
            {t('games.story.start')}
          </Button>
        </form>

        {stories.length === 0 ? (
          <p className="text-muted-foreground">{t('games.story.empty')}</p>
        ) : (
          <ul className="space-y-2">
            {stories.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => setOpenId(s.id)}
                  aria-current={s.id === openId}
                  className={cn(
                    'flex min-h-12 w-full items-center gap-2 rounded-lg border px-3 text-left font-semibold',
                    s.id === openId ? 'border-primary bg-accent' : 'border-border bg-card hover:bg-accent',
                  )}
                >
                  <BookOpen aria-hidden className="size-4 shrink-0" />
                  <span className="truncate">{s.title}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="min-w-0 space-y-4">
        {story ? (
          <>
            <h2 className="text-2xl font-bold">{story.title}</h2>
            <p className="rounded-lg border border-border bg-card p-5 text-lg leading-loose" aria-live="polite">
              {story.sentences.length === 0 && <span className="text-muted-foreground">{t('games.story.noSentences')}</span>}
              {story.sentences.map((s, i) =>
                s.kind === 'narrator' ? (
                  <em key={i} className="mr-1.5 inline rounded bg-accent px-1.5 not-italic">
                    <span className="sr-only">{t('games.story.narrator')}: </span>
                    <span className="inline-flex items-center gap-1 font-semibold">
                      <Sparkles aria-hidden className="size-4" />
                      {s.text}
                    </span>
                  </em>
                ) : (
                  <span key={i} className={cn('mr-1.5 underline decoration-4 underline-offset-4', UNDERLINE[s.role ?? 'parent'])} title={s.name}>
                    {s.text}
                  </span>
                ),
              )}
            </p>

            {myTurn ? (
              <form onSubmit={add} className="space-y-2">
                <p className="font-semibold">{t('games.story.yourTurn')}</p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={t('games.story.sentencePlaceholder')}
                    aria-label={t('games.story.addSentence')}
                    maxLength={300}
                    className="flex-1"
                  />
                  <Button type="submit" size="lg" disabled={busy || !text.trim()}>
                    {t('games.story.addSentence')}
                  </Button>
                </div>
              </form>
            ) : (
              <p role="status" className="font-semibold text-muted-foreground">
                {t('games.story.waitOthers')}
              </p>
            )}

            {canNarrate && (canUseAi ? (
              <Button variant="outline" onClick={narrate} disabled={busy}>
                <Sparkles aria-hidden />
                {t('games.story.askNarrator')}
              </Button>
            ) : (
              <UpgradeGate />
            ))}

            {errorText && (
              <p role="alert" className="font-medium text-destructive">
                {errorText}
              </p>
            )}
          </>
        ) : (
          <p className="text-lg text-muted-foreground">{t('games.story.desc')}</p>
        )}
      </div>
    </div>
  );
}
