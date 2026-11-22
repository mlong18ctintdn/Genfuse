'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { MessageSquareHeart, Star } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useFamily } from '@/components/providers/family-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Label, Textarea } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const CATEGORIES = ['ui', 'games', 'ai', 'other'] as const;
type Category = (typeof CATEGORIES)[number];

/** Rating (1-5 stars) + category + message, saved to public.app_feedback (migration 005). */
export function FeedbackDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const t = useTranslations();
  const { meId, familyId } = useFamily();
  const [rating, setRating] = useState(0);
  const [category, setCategory] = useState<Category>('other');
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset(o: boolean) {
    onOpenChange(o);
    if (!o) {
      // Let the closing animation finish before clearing.
      setTimeout(() => {
        setDone(false);
        setRating(0);
        setComment('');
        setCategory('other');
        setError(null);
      }, 200);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (rating < 1) return setError(t('feedback.needRating'));
    setBusy(true);
    setError(null);
    const { error: err } = await createClient()
      .from('app_feedback')
      .insert({ user_id: meId, family_id: familyId, rating, category, comment: comment.trim() || null });
    setBusy(false);
    if (err) return setError(err.message.includes('FEEDBACK_LIMIT') ? t('errors.FEEDBACK_LIMIT') : t('errors.GENERIC'));
    setDone(true);
  }

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogContent>
        <DialogTitle>{t('feedback.title')}</DialogTitle>
        <DialogDescription>{t('feedback.subtitle')}</DialogDescription>

        {done ? (
          <div role="status" className="space-y-4 py-4 text-center">
            <p className="text-5xl" aria-hidden>
              🌟
            </p>
            <p className="text-xl font-extrabold">{t('feedback.thanks')}</p>
            <p className="text-muted-foreground">{t('feedback.thanksBody')}</p>
            <Button size="lg" onClick={() => reset(false)}>
              {t('common.close')}
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-4 space-y-5">
            <fieldset>
              <legend className="mb-2 font-semibold">{t('feedback.rating')}</legend>
              <div className="flex gap-1" role="radiogroup" aria-label={t('feedback.rating')}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={rating === n}
                    aria-label={t('feedback.stars', { count: n })}
                    onClick={() => setRating(n)}
                    className="grid size-12 place-items-center rounded-lg hover:bg-accent"
                  >
                    <Star aria-hidden className={cn('size-9', n <= rating ? 'fill-gran text-gran' : 'text-muted-foreground')} />
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-2 font-semibold">{t('feedback.category')}</legend>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <label
                    key={c}
                    className="flex min-h-11 cursor-pointer items-center rounded-full border-2 border-input bg-card px-4 font-semibold has-[:checked]:border-primary has-[:checked]:bg-accent has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-ring"
                  >
                    <input type="radio" name="fb-cat" checked={category === c} onChange={() => setCategory(c)} className="sr-only" />
                    {t(`feedback.cat.${c}`)}
                  </label>
                ))}
              </div>
            </fieldset>

            <div>
              <Label htmlFor="fb-comment">{t('feedback.message')}</Label>
              <Textarea id="fb-comment" value={comment} onChange={(e) => setComment(e.target.value)} maxLength={1000} rows={4} />
            </div>

            {error && (
              <p role="alert" className="font-medium text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" size="lg" className="w-full" disabled={busy}>
              {t('feedback.send')}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Sidebar entry (placed right above the AI companion) or compact icon button for the mobile header. */
export function FeedbackButton({ variant }: { variant: 'side' | 'icon' }) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  return (
    <>
      {variant === 'side' ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex min-h-12 w-full items-center gap-3 rounded-lg px-3 text-left font-semibold transition-colors hover:bg-accent"
        >
          <MessageSquareHeart aria-hidden className="size-5 shrink-0" />
          {t('nav.feedback')}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t('nav.feedback')}
          className="grid size-11 place-items-center rounded-lg hover:bg-accent md:hidden"
        >
          <MessageSquareHeart aria-hidden className="size-5" />
        </button>
      )}
      <FeedbackDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
