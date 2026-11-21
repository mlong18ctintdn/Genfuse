'use client';

import { useMemo } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useCredits } from '@/components/providers/credit-provider';
import { errorCode, messageText } from '@/lib/chat-utils';

/**
 * One-shot streaming helper for the structured features (translator, scam checker).
 * Each run starts from a clean slate; only the latest answer is exposed.
 */
export function useOneShotAi(feature: 'translator' | 'scam_check') {
  const { refresh, canUseAi } = useCredits();
  const transport = useMemo(() => new DefaultChatTransport({ api: '/api/chat', body: { feature } }), [feature]);
  const { messages, sendMessage, setMessages, status, error } = useChat({
    transport,
    onFinish: () => void refresh(),
  });

  const last = [...messages].reverse().find((m) => m.role === 'assistant');
  const busy = status === 'submitted' || status === 'streaming';

  return {
    run: (text: string) => {
      const v = text.trim();
      if (!v || busy || !canUseAi) return;
      setMessages([]);
      void sendMessage({ text: v });
    },
    text: last ? messageText(last) : '',
    busy,
    waiting: status === 'submitted',
    done: status === 'ready' && !!last,
    errorCode: errorCode(error),
    canUseAi,
  };
}
