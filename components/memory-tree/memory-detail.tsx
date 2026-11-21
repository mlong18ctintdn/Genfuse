'use client';

import { useLocale, useTranslations } from 'next-intl';
import { CornerDownRight, Lock, Volume2, VolumeX } from 'lucide-react';
import { Badge, roleTone } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { useSpeech } from '@/lib/hooks/use-speech';
import type { Lang } from '@/lib/ai/prompts';
import { isSealed, type MemoryItem } from './types';

export function MemoryDetail({
  item,
  onClose,
  onReply,
}: {
  item: MemoryItem | null;
  onClose: () => void;
  onReply: (m: MemoryItem) => void;
}) {
  const t = useTranslations();
  const locale = useLocale() as Lang;
  const speech = useSpeech(locale);

  const sealed = item ? isSealed(item) : false;
  const fmt = (iso: string, utc = false) =>
    new Intl.DateTimeFormat(locale, { dateStyle: 'long', ...(utc ? { timeZone: 'UTC' } : {}) }).format(new Date(iso));

  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && (speech.stopSpeaking(), onClose())}>
      <DialogContent>
        {item && (
          <>
            <DialogTitle>{sealed ? t('memoryTree.locked') : item.title}</DialogTitle>
            <DialogDescription asChild>
              <div className="-mt-2 flex flex-wrap items-center gap-2 text-sm">
                <Badge tone={roleTone[item.authorRole]}>
                  {t('memoryTree.by', { name: item.authorName })}
                </Badge>
                {item.memoryDate && <time dateTime={item.memoryDate}>{fmt(`${item.memoryDate}T00:00:00Z`, true)}</time>}
              </div>
            </DialogDescription>

            {item.parentTitle && (
              <p className="flex items-start gap-2 text-sm text-muted-foreground">
                <CornerDownRight aria-hidden className="mt-0.5 size-4 shrink-0" />
                {t('memoryTree.replyTo', { title: item.parentTitle })}
              </p>
            )}

            {sealed ? (
              <p className="flex items-center gap-3 rounded-lg bg-muted p-4 text-lg font-semibold">
                <Lock aria-hidden className="size-6 shrink-0" />
                <span suppressHydrationWarning>{t('memoryTree.lockedUntil', { date: fmt(item.unlockDate!) })}</span>
              </p>
            ) : (
              <>
                {item.mediaType === 'image' && item.mediaUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.mediaUrl} alt={item.title} loading="lazy" className="max-h-80 w-full rounded-lg object-cover" />
                )}
                {item.mediaType === 'audio' && item.mediaUrl && <audio controls src={item.mediaUrl} className="w-full" />}
                {item.content && <p className="whitespace-pre-wrap text-[1.05rem] leading-relaxed">{item.content}</p>}

                {(item.aiEmotion || item.aiSummary) && (
                  <div className="rounded-lg bg-accent p-4">
                    {item.aiEmotion && <p className="font-bold">{item.aiEmotion}</p>}
                    {item.aiSummary && <p className="mt-1">{item.aiSummary}</p>}
                  </div>
                )}
                {item.aiFollowUp && (
                  <div className="rounded-lg bg-kid/10 p-4">
                    <p className="text-sm font-bold text-kid-ink">{t('memoryTree.aiFollowUp')}</p>
                    <p className="mt-1">{item.aiFollowUp}</p>
                  </div>
                )}

                <div className="flex flex-wrap gap-3">
                  <Button onClick={() => onReply(item)}>{t('memoryTree.reply')}</Button>
                  {speech.canSpeak && (item.content || item.aiFollowUp) && (
                    <Button
                      variant="outline"
                      onClick={() =>
                        speech.speaking
                          ? speech.stopSpeaking()
                          : speech.speak([item.title, item.content, item.aiFollowUp].filter(Boolean).join('. '))
                      }
                    >
                      {speech.speaking ? <VolumeX aria-hidden /> : <Volume2 aria-hidden />}
                      {speech.speaking ? t('companion.stopReading') : t('companion.readAloud')}
                    </Button>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
