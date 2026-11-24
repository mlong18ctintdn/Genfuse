'use client';

import { useState } from 'react';
import { OAnQuanGame } from './o-an-quan';
import { CoCaNguaGame } from './co-ca-ngua';
import { WordGame } from './word-game';

type Tab = 'oaq' | 'cangua' | 'word';

export function GamesClient({ familyId }: { familyId: string }) {
  const [tab, setTab] = useState<Tab>('oaq');

  const tabs: { id: Tab; label: string; desc: string }[] = [
    { id: 'oaq', label: '🪨 Ô Ăn Quan', desc: 'Trò chơi dân gian rèn trí nhớ & tính nhẩm' },
    { id: 'cangua', label: '🐴 Cờ Cá Ngựa', desc: 'Tung xúc xắc realtime cùng người thân' },
    { id: 'word', label: '🔤 Đố Chữ Gia Đình', desc: 'Nối từ & giải ô chữ có AI gợi ý' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
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

      {tab === 'oaq' && <OAnQuanGame familyId={familyId} />}
      {tab === 'cangua' && <CoCaNguaGame familyId={familyId} />}
      {tab === 'word' && <WordGame familyId={familyId} />}
    </div>
  );
}
