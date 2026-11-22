'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { StoryGame, type Story } from './story-game';
import { WordGame, type WordRow } from './word-game';
import { ChoreWheel, type SpinRow, type WheelChore } from './chore-wheel';
import { OAnQuan } from './o-an-quan';

const TABS = ['oaq', 'chore', 'story', 'word'] as const;
type Tab = (typeof TABS)[number];

export function GamesClient({
  familyId,
  myId,
  stories,
  chores,
  spins,
  autoSpeak,
  word,
}: {
  familyId: string;
  myId: string;
  stories: Story[];
  chores: WheelChore[];
  spins: SpinRow[];
  autoSpeak: boolean;
  word: WordRow | null;
}) {
  const t = useTranslations();
  const [tab, setTab] = useState<Tab>('oaq');

  return (
    <div className="space-y-6">
      <div role="tablist" aria-label={t('games.title')} className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1 sm:inline-grid sm:grid-cols-4">
        {TABS.map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            id={`tab-${k}`}
            aria-selected={tab === k}
            aria-controls={`panel-${k}`}
            onClick={() => setTab(k)}
            className={cn('min-h-12 rounded-md px-4 font-bold', tab === k ? 'bg-card shadow-sm' : 'text-muted-foreground')}
          >
            {t(`games.${k}.title`)}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === 'story' && <StoryGame familyId={familyId} myId={myId} initial={stories} />}
        {tab === 'chore' && <ChoreWheel initialChores={chores} initialHistory={spins} />}
        {tab === 'oaq' && <OAnQuan myId={myId} autoSpeak={autoSpeak} />}
        {tab === 'word' && <WordGame initialGame={word} />}
      </div>
    </div>
  );
}
