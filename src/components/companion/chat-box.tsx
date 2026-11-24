'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import { Mic, Send, Square, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { UpgradeGate } from '@/components/premium/upgrade-gate';
import { useCredits } from '@/components/providers/credit-provider';
import { useSpeech } from '@/lib/hooks/use-speech';
import { errorCode, messageText, safeErrorKey } from '@/lib/chat-utils';
import type { Lang, Role } from '@/lib/ai/prompts';
import { cn } from '@/lib/utils';

type Props = {
  role: Role;
  displayName: string;
  initialMessages: UIMessage[];
  /** Senior mode: read replies aloud and send voice input automatically. */
  autoSpeak?: boolean;
  className?: string;
};

export function ChatBox({ role, displayName, initialMessages, autoSpeak = false, className }: Props) {
  const t = useTranslations();
  const locale = useLocale() as Lang;
  const { refresh, access } = useCredits();
  const speech = useSpeech(locale);

  const transport = useMemo(
    () => new DefaultChatTransport({ api: '/api/chat', body: { feature: 'companion' } }),
    [],
  );
  const { messages, sendMessage, status, error } = useChat({
    transport,
    messages: initialMessages,
    onFinish: () => void refresh(),
  });

  const [input, setInput] = useState('');
  const [autoRead, setAutoRead] = useState(autoSpeak);
  const endRef = useRef<HTMLDivElement>(null);
  const prevStatus = useRef(status);
  const busy = status === 'submitted' || status === 'streaming';
  const chips = t.raw(`companion.chips.${role}`) as string[];

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, status]);

  useEffect(() => {
    if (prevStatus.current === 'streaming' && status === 'ready' && autoRead && speech.canSpeak) {
      const last = [...messages].reverse().find((m) => m.role === 'assistant');
      if (last) speech.speak(messageText(last));
    }
    prevStatus.current = status;
  }, [status, autoRead, messages, speech]);

  const showGreeting = messages.length === 0;
  const code = errorCode(error);
  const dailyLimitReached = !access.premium && code === 'NO_CREDITS';

  function send(text: string) {
    const value = text.trim();
    if (!value || busy || dailyLimitReached) return;
    speech.stopSpeaking();
    void sendMessage({ text: value });
    setInput('');
  }

  function toggleMic() {
    if (speech.listening) return speech.stopListening();
    speech.stopSpeaking();
    speech.startListening((text, isFinal) => {
      setInput(text);
      if (isFinal && autoSpeak && text) send(text);
    });
  }

  return (
    <div className={cn('flex min-h-0 flex-1 flex-col gap-3', className)}>
      {!access.premium && (
        <div className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
          {locale === 'vi'
            ? '🎁 Miễn phí 3 lượt trò chuyện AI mỗi ngày • Nâng cấp Pro để chat không giới hạn'
            : '🎁 3 free AI chats daily • Upgrade to Family Pro for unlimited chats'}
        </div>
      )}

      <div
        role="log"
        aria-live="polite"
        aria-label={t('companion.name')}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1"
      >
        {showGreeting && (
          <Bubble who="assistant" label={t('companion.name')}>
            {t(`companion.greeting.${role}`, { name: displayName })}
          </Bubble>
        )}

        {messages.map((m) => {
          const text = messageText(m);
          if (!text) return null;
          return (
            <Bubble
              key={m.id}
              who={m.role === 'user' ? 'user' : 'assistant'}
              label={m.role === 'user' ? displayName : t('companion.name')}
              action={
                m.role === 'assistant' && speech.canSpeak ? (
                  <button
                    type="button"
                    onClick={() => (speech.speaking ? speech.stopSpeaking() : speech.speak(text))}
                    className="mt-2 inline-flex min-h-9 items-center gap-1.5 rounded-md px-2 text-sm font-semibold text-muted-foreground hover:bg-accent"
                  >
                    {speech.speaking ? <VolumeX className="size-4" aria-hidden /> : <Volume2 className="size-4" aria-hidden />}
                    {speech.speaking ? t('companion.stopReading') : t('companion.readAloud')}
                  </button>
                ) : null
              }
            >
              {text}
            </Bubble>
          );
        })}

        {status === 'submitted' && (
          <p className="px-2 text-muted-foreground" role="status">
            {t('companion.thinking')}
          </p>
        )}

        {error && code !== 'NO_CREDITS' && (
          <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 font-medium text-destructive">
            {t(`errors.${safeErrorKey(code)}`)}
          </p>
        )}
        <div ref={endRef} />
      </div>

      {dailyLimitReached ? (
        <UpgradeGate />
      ) : (
        <>
          <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Quick prompts">
            {chips.map((chip) => (
              <button
                key={chip}
                type="button"
                disabled={busy}
                onClick={() => send(chip)}
                className="shrink-0 rounded-full border-2 border-input bg-card px-4 py-2 text-[0.95rem] font-medium hover:bg-accent disabled:opacity-50"
              >
                {chip}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="space-y-2"
          >
            {speech.listening && (
              <p role="status" className="font-semibold text-kid-ink">
                {t('companion.listening')}
              </p>
            )}
            {speech.error && (
              <p role="alert" className="text-destructive">
                {speech.error === 'permission' ? t('voice.permissionDenied') : t('voice.unsupported')}
              </p>
            )}
            <div className="flex items-end gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                placeholder={t('companion.placeholder')}
                aria-label={t('companion.placeholder')}
                rows={1}
                maxLength={2000}
                className="min-h-12 flex-1 resize-none"
              />
              <Button
                type="button"
                variant={speech.listening ? 'destructive' : 'secondary'}
                size={autoSpeak ? 'lg' : 'default'}
                onClick={toggleMic}
                aria-pressed={speech.listening}
                disabled={!speech.canListen}
                title={!speech.canListen ? t('voice.unsupported') : undefined}
              >
                {speech.listening ? <Square aria-hidden /> : <Mic aria-hidden />}
                {speech.listening ? t('companion.stopListening') : t('companion.speak')}
              </Button>
              <Button type="submit" size={autoSpeak ? 'lg' : 'default'} disabled={busy || !input.trim()}>
                <Send aria-hidden />
                <span className="sr-only sm:not-sr-only">{t('common.send')}</span>
              </Button>
            </div>
            {speech.canSpeak && (
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={autoRead}
                  onChange={(e) => setAutoRead(e.target.checked)}
                  className="size-4 accent-primary"
                />
                {t('companion.autoRead')}
              </label>
            )}
          </form>
        </>
      )}
    </div>
  );
}

function Bubble({
  who,
  label,
  children,
  action,
}: {
  who: 'user' | 'assistant';
  label: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  const mine = who === 'user';
  return (
    <div className={cn('flex flex-col', mine ? 'items-end' : 'items-start')}>
      <span className="mb-1 px-1 text-sm font-semibold text-muted-foreground">{label}</span>
      <div
        className={cn(
          'max-w-[92%] whitespace-pre-wrap rounded-lg px-4 py-3 text-[1.02rem] leading-relaxed',
          mine ? 'rounded-br-sm bg-primary text-primary-foreground' : 'rounded-bl-sm border border-border bg-card',
        )}
      >
        {children}
        {action}
      </div>
    </div>
  );
}
