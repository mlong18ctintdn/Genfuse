'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { UIMessage } from 'ai';
import { MessageCircleHeart } from 'lucide-react';
import { usePathname } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { ChatBox } from './chat-box';
import { fetchCompanionHistory } from './history';
import type { Role } from '@/lib/ai/prompts';

/** Floating entry to the companion from any screen. History is loaded only when it is opened. */
export function FloatingCompanion({
  role,
  displayName,
  autoSpeak,
}: {
  role: Role;
  displayName: string;
  autoSpeak: boolean;
}) {
  const t = useTranslations();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<UIMessage[] | null>(null);

  useEffect(() => {
    if (!open || history) return;
    let alive = true;
    fetchCompanionHistory(createClient()).then((h) => alive && setHistory(h));
    return () => {
      alive = false;
    };
  }, [open, history]);

  if (pathname.startsWith('/companion')) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-4 z-40 flex min-h-14 items-center gap-2 rounded-full bg-primary px-5 font-bold text-primary-foreground shadow-lg md:bottom-6 md:right-6"
      >
        <MessageCircleHeart aria-hidden className="size-6" />
        {t('companion.name')}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent placement="sheet">
          <DialogTitle>{t('companion.name')}</DialogTitle>
          <DialogDescription className="-mt-3 text-sm">{t('companion.privateNote')}</DialogDescription>
          {history ? (
            <ChatBox role={role} displayName={displayName} initialMessages={history} autoSpeak={autoSpeak} />
          ) : (
            <div className="space-y-3" role="status" aria-busy="true">
              <Skeleton className="h-16 w-4/5" />
              <Skeleton className="ml-auto h-12 w-3/5" />
              <Skeleton className="h-20 w-4/5" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
