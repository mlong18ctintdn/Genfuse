'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Lock, Plus } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AddMemoryDialog } from './add-memory-dialog';
import { MemoryDetail } from './memory-detail';
import { TreeSvg } from './tree-svg';
import { isSealed, type MemoryItem } from './types';

const DOT = { grandparent: 'bg-gran', parent: 'bg-par', child: 'bg-kid' } as const;

export function MemoryTreeClient({
  items,
  familyId,
  limitReached,
}: {
  items: MemoryItem[];
  familyId: string;
  limitReached: boolean;
}) {
  const t = useTranslations();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<{ id: string; title: string } | null>(null);

  const selected = items.find((i) => i.id === selectedId) ?? null;

  function openAdd(reply: { id: string; title: string } | null) {
    setReplyTo(reply);
    setSelectedId(null);
    setAddOpen(true);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold">{t('memoryTree.title')}</h1>
          <p className="mt-1 max-w-[56ch] text-muted-foreground">{t('memoryTree.subtitle')}</p>
        </div>
        {limitReached ? (
          <p className="max-w-sm rounded-lg bg-gran/20 p-3 font-semibold text-gran-ink" role="status">
            {t('memoryTree.limitReached')}{' '}
            <Link href="/premium" className="underline underline-offset-4">
              {t('credits.upgradeCta')}
            </Link>
          </p>
        ) : (
          <Button size="lg" onClick={() => openAdd(null)}>
            <Plus aria-hidden />
            {t('memoryTree.addLeaf')}
          </Button>
        )}
      </header>

      <section className="rounded-lg border border-border bg-card p-3 md:p-6" aria-label={t('memoryTree.title')}>
        {items.length === 0 && <p className="mb-2 text-center text-lg font-semibold">{t('memoryTree.empty')}</p>}
        <div className="mx-auto max-w-2xl">
          <TreeSvg items={items} onSelect={setSelectedId} />
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm font-semibold">
          <span>{t('memoryTree.leavesCount', { count: items.length })}</span>
          {(['grandparent', 'parent', 'child'] as const).map((r) => (
            <span key={r} className="flex items-center gap-2">
              <span aria-hidden className={cn('size-3.5 rounded-full', DOT[r])} />
              {t(`onboarding.roles.${r}`)}
            </span>
          ))}
        </div>
      </section>

      {/* Same memories as a plain list: bigger targets and easier for screen readers than the leaves. */}
      {items.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2">
          {[...items].reverse().map((m) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => setSelectedId(m.id)}
                className="flex min-h-16 w-full items-center gap-3 rounded-lg border border-border bg-card p-4 text-left hover:bg-accent"
              >
                <span aria-hidden className={cn('size-4 shrink-0 rounded-full', DOT[m.authorRole])} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 truncate font-bold">
                    {isSealed(m) && <Lock aria-hidden className="size-4 shrink-0" />}
                    {isSealed(m) ? t('memoryTree.locked') : m.title}
                  </span>
                  <span className="block truncate text-sm text-muted-foreground">{m.authorName}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <MemoryDetail item={selected} onClose={() => setSelectedId(null)} onReply={(m) => openAdd({ id: m.id, title: m.title })} />
      <AddMemoryDialog open={addOpen} onOpenChange={setAddOpen} familyId={familyId} replyTo={replyTo} />
    </div>
  );
}
