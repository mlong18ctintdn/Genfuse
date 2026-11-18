'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { StoryGame, type Story } from './story-game';
import { TriviaGame } from './trivia-game';

export function GamesClient({ familyId, myId, stories }: { familyId: string; myId: string; stories: Story[] }) {
  const t = useTranslations();
  const [tab, setTab] = useState<'trivia' | 'story'>('trivia');

  return (
    <div className="space-y-6">
      <div role="tablist" aria-label={t('games.title')} className="inline-flex rounded-lg bg-muted p-1">
        {(['trivia', 'story'] as const).map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            id={`tab-${k}`}
            aria-selected={tab === k}
            aria-controls={`panel-${k}`}
            onClick={() => setTab(k)}
            className={cn('min-h-12 rounded-md px-5 font-bold', tab === k ? 'bg-card shadow-sm' : 'text-muted-foreground')}
          >
            {t(`games.${k}.title`)}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === 'trivia' ? <TriviaGame /> : <StoryGame familyId={familyId} myId={myId} initial={stories} />}
      </div>
    </div>
  );
}
