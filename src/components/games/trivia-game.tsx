'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UpgradeGate } from '@/components/premium/upgrade-gate';
import { useCredits } from '@/components/providers/credit-provider';
import { safeErrorKey } from '@/lib/chat-utils';
import { cn } from '@/lib/utils';

type Question = { question: string; options: string[]; correctIndex: number; explanation: string };
type Phase = 'idle' | 'loading' | 'playing' | 'done';

export function TriviaGame() {
  const t = useTranslations();
  const { refresh, canUseAi } = useCredits();
  const [phase, setPhase] = useState<Phase>('idle');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setPhase('loading');
    setError(null);
    try {
      const res = await fetch('/api/trivia', { method: 'POST' });
      const body = (await res.json()) as { questions?: Question[]; error?: string };
      if (!res.ok || !body.questions) {
        setError(body.error ?? 'GENERIC');
        setPhase('idle');
        return;
      }
      setQuestions(body.questions);
      setIndex(0);
      setScore(0);
      setPicked(null);
      setPhase('playing');
      void refresh();
    } catch {
      setError('GENERIC');
      setPhase('idle');
    }
  }

  if (phase === 'playing') {
    const q = questions[index];
    const answered = picked !== null;
    return (
      <div className="space-y-5">
        <p className="font-semibold text-muted-foreground">{t('games.trivia.question', { number: index + 1 })} / {questions.length}</p>
        <h2 className="text-2xl font-bold">{q.question}</h2>
        <ul className="grid gap-3">
          {q.options.map((opt, i) => {
            const isRight = i === q.correctIndex;
            const isPicked = i === picked;
            return (
              <li key={opt}>
                <button
                  type="button"
                  disabled={answered}
                  onClick={() => {
                    setPicked(i);
                    if (isRight) setScore((s) => s + 1);
                  }}
                  className={cn(
                    'flex min-h-14 w-full items-center gap-3 rounded-lg border-2 px-4 py-3 text-left text-lg font-semibold',
                    !answered && 'border-input bg-card hover:bg-accent',
                    answered && isRight && 'border-success bg-success/10',
                    answered && isPicked && !isRight && 'border-destructive bg-destructive/10',
                    answered && !isRight && !isPicked && 'border-border opacity-60',
                  )}
                >
                  {answered && isRight && <Check aria-hidden className="size-6 shrink-0 text-success" />}
                  {answered && isPicked && !isRight && <X aria-hidden className="size-6 shrink-0 text-destructive" />}
                  {opt}
                </button>
              </li>
            );
          })}
        </ul>
        {answered && (
          <div role="status" className="space-y-3">
            <p className="text-lg font-bold">{picked === q.correctIndex ? t('games.trivia.correct') : t('games.trivia.wrong')}</p>
            <p>{q.explanation}</p>
            <Button
              size="lg"
              onClick={() => {
                if (index + 1 >= questions.length) setPhase('done');
                else {
                  setIndex(index + 1);
                  setPicked(null);
                }
              }}
            >
              {index + 1 >= questions.length ? t('games.trivia.finish') : t('games.trivia.next')}
            </Button>
          </div>
        )}
      </div>
    );
  }

  if (phase === 'done') {
    return (
      <div className="space-y-4" role="status">
        <p className="text-3xl font-extrabold">{t('games.trivia.score', { score, total: questions.length })}</p>
        <Button size="lg" onClick={() => setPhase('idle')} disabled={!canUseAi}>
          {t('games.trivia.playAgain')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="max-w-[56ch] text-lg">{t('games.trivia.desc')}</p>
      {!canUseAi || error === 'NO_CREDITS' ? (
        <UpgradeGate />
      ) : (
        <Button size="lg" onClick={start} disabled={phase === 'loading'}>
          {phase === 'loading' ? t('games.trivia.loading') : t('games.trivia.start')}
        </Button>
      )}
      {error && error !== 'NO_CREDITS' && (
        <p role="alert" className="font-medium text-destructive">
          {error === 'NEED_MEMORIES' ? t('games.trivia.needMemories') : t(`errors.${safeErrorKey(error)}`)}
        </p>
      )}
    </div>
  );
}
