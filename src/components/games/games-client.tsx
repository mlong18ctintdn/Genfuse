'use client';

import { useState } from 'react';
import { OAnQuan } from './o-an-quan';
import { CoCaNguaGame } from './co-ca-ngua';
import { WordGame, type WordRow } from './word-game';
import { ChoreWheel, type SpinRow, type WheelChore } from './chore-wheel';

type Tab = 'oaq' | 'cangua' | 'word' | 'chore';

export function GamesClient({
  familyId,
  myId,
  chores,
  spins,
  autoSpeak,
  word,
}: {
  familyId: string;
  myId: string;
  chores: WheelChore[];
  spins: SpinRow[];
  autoSpeak: boolean;
  word: WordRow | null;
}) {
  const [tab, setTab] = useState<Tab>('oaq');

  const tabs: { id: Tab; label: string; desc: string }[] = [
    { id: 'oaq', label: '🪨 Ô Ăn Quan', desc: 'Trò chơi dân gian rèn trí nhớ & tính nhẩm' },
    { id: 'cangua', label: '🐴 Cờ Cá Ngựa', desc: 'Tung xúc xắc realtime cùng người thân' },
    { id: 'word', label: '🔤 Đố Chữ Gia Đình', desc: 'Đoán từ khóa từ xa có AI gợi ý' },
    { id: 'chore', label: '🎡 Vòng Xoay Việc Nhà', desc: 'Chia việc nhà công bằng & vui nhộn' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tabs.map((item) => {
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`rounded-xl border-2 p-4 text-left transition ${
                active
                  ? 'border-primary bg-primary/10 shadow-sm'
                  : 'border-border bg-card hover:bg-accent/50'
              }`}
            >
              <div className="text-lg font-extrabold">{item.label}</div>
              <p className="mt-1 text-xs text-muted-foreground">{item.desc}</p>
            </button>
          );
        })}
      </div>

      {tab === 'oaq' && <OAnQuan myId={myId} autoSpeak={autoSpeak} />}
      {tab === 'cangua' && <CoCaNguaGame familyId={familyId} />}
      {tab === 'word' && <WordGame initialGame={word} />}
      {tab === 'chore' && <ChoreWheel initialChores={chores} initialHistory={spins} />}
    </div>
  );
}
