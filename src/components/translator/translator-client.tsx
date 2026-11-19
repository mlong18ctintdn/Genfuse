'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Brain, Lightbulb, MessageSquareHeart, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CopyButton } from '@/components/ui/copy-button';
import { Skeleton } from '@/components/ui/skeleton';
import { UpgradeGate } from '@/components/premium/upgrade-gate';
import { useSpeech } from '@/lib/hooks/use-speech';
import { parseSections, safeErrorKey } from '@/lib/chat-utils';
import type { Lang } from '@/lib/ai/prompts';
import { useOneShotAi } from './ai-stream';

const CARDS = [
  { key: 'MEANING', title: 'translator.cards.meaning', icon: Lightbulb, accent: 'border-l-gran', ink: 'text-gran-ink' },
  { key: 'CONTEXT', title: 'translator.cards.context', icon: Brain, accent: 'border-l-par', ink: 'text-par-ink' },
  { key: 'SCRIPT', title: 'translator.cards.script', icon: MessageSquareHeart, accent: 'border-l-kid', ink: 'text-kid-ink' },
] as const;

export function TranslatorClient() {
  const t = useTranslations();
  const locale = useLocale() as Lang;
  const speech = useSpeech(locale);
  const ai = useOneShotAi('translator');
  const [term, setTerm] = useState('');
  const examples = t.raw('translator.examples') as string[];

  const sections = parseSections(ai.text, ['MEANING', 'CONTEXT', 'SCRIPT']);
  const showResults = ai.busy || ai.text.length > 0;

  function submit(value: string) {
    setTerm(value);
    ai.run(value);
  }

  return (
    <div className="space-y-6">
      {!ai.canUseAi && <UpgradeGate />}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(term);
        }}
        className="flex flex-col gap-3 sm:flex-row"
      >
        <Input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder={t('translator.placeholder')}
          aria-label={t('translator.placeholder')}
          maxLength={500}
          className="flex-1"
        />
        <Button type="submit" size="lg" disabled={ai.busy || !term.trim() || !ai.canUseAi}>
          {ai.busy ? t('common.loading') : t('translator.translate')}
        </Button>
      </form>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground">{t('translator.hint')}</span>
        {examples.map((ex) => (
          <button
            key={ex}
            type="button"
            disabled={ai.busy || !ai.canUseAi}
            onClick={() => submit(ex)}
            className="rounded-full border-2 border-input bg-card px-4 py-1.5 font-semibold hover:bg-accent disabled:opacity-50"
          >
            {ex}
          </button>
        ))}
      </div>

      {ai.errorCode && ai.errorCode !== 'NO_CREDITS' && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 font-medium text-destructive">
          {t(`errors.${safeErrorKey(ai.errorCode)}`)}
        </p>
      )}

      {showResults && (
        <div className="grid gap-4 md:grid-cols-3" aria-live="polite" aria-busy={ai.busy}>
          {CARDS.map(({ key, title, icon: Icon, accent, ink }) => {
            const body = sections[key];
            return (
              <article key={key} className={`flex flex-col rounded-lg border border-border border-l-[6px] bg-card p-5 ${accent}`}>
                <h2 className={`flex items-center gap-2 text-lg font-bold ${ink}`}>
                  <Icon aria-hidden className="size-5" />
                  {t(title)}
                </h2>
                {body ? (
                  <p className="mt-3 whitespace-pre-wrap text-[1.02rem] leading-relaxed">{body}</p>
                ) : (
                  <div className="mt-3 space-y-2" aria-hidden>
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                )}
                {body && ai.done && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {key === 'SCRIPT' && <CopyButton text={body} size="sm" />}
                    {speech.canSpeak && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => (speech.speaking ? speech.stopSpeaking() : speech.speak(body))}
                      >
                        {speech.speaking ? <VolumeX aria-hidden /> : <Volume2 aria-hidden />}
                        {speech.speaking ? t('companion.stopReading') : t('companion.readAloud')}
                      </Button>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
