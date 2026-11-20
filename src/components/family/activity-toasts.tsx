'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Bell, X } from 'lucide-react';
import { ACTIVITY_KINDS, useFamily, type ActivityKind } from '@/components/providers/family-provider';

type Toast = { id: number; text: string };
let nextId = 1;

/** Small, polite notices for what other family members just did. */
export function ActivityToasts() {
  const t = useTranslations();
  const { on, meId } = useFamily();
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    return on('activity', (p) => {
      if (!p || p.by === meId || !ACTIVITY_KINDS.includes(p.kind)) return;
      const kind = p.kind as ActivityKind;
      const clip = (v: unknown) => String(v ?? '').slice(0, 80);
      const text = t(`activity.${kind}`, {
        name: clip(p.name),
        chore: clip(p.params?.chore),
        who: clip(p.params?.who),
      });
      const id = nextId++;
      setToasts((prev) => [...prev.slice(-2), { id, text }]);
      setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 6000);
    });
  }, [on, meId, t]);

  if (toasts.length === 0) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-3 bottom-24 z-40 space-y-2 md:inset-x-auto md:bottom-6 md:right-6 md:w-96"
    >
      {toasts.map((x) => (
        <div
          key={x.id}
          className="pointer-events-auto flex items-start gap-3 rounded-lg border border-border bg-card p-4 font-semibold shadow-lg"
        >
          <Bell aria-hidden className="mt-0.5 size-5 shrink-0 text-gran-ink" />
          <span className="flex-1">{x.text}</span>
          <button
            type="button"
            aria-label={t('common.close')}
            onClick={() => setToasts((prev) => prev.filter((y) => y.id !== x.id))}
            className="grid size-8 place-items-center rounded-md hover:bg-accent"
          >
            <X aria-hidden className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
