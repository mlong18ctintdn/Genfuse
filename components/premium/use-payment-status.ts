'use client';

import { useEffect, useRef, useState } from 'react';
import { useCredits } from '@/components/providers/credit-provider';
import { useRouter } from '@/i18n/navigation';

export type PaymentState = 'pending' | 'paid' | 'cancelled' | 'timeout';

const POLL_MS = 3000;
const GIVE_UP_MS = 16 * 60 * 1000; // a bit longer than the 15-minute payment link

/** Polls /api/payos/status until the order is paid or cancelled. Credits/plan refresh on success. */
export function usePaymentStatus(orderCode: number | null, enabled = true): PaymentState {
  const { refresh } = useCredits();
  const router = useRouter();
  const [state, setState] = useState<PaymentState>('pending');
  const doneRef = useRef(false);

  useEffect(() => {
    if (!orderCode || !enabled) return;
    doneRef.current = false;
    setState('pending');
    const startedAt = Date.now();
    let timer: ReturnType<typeof setTimeout>;
    let alive = true;

    async function tick() {
      if (!alive || doneRef.current) return;
      try {
        const res = await fetch(`/api/payos/status?orderCode=${orderCode}`, { cache: 'no-store' });
        if (res.ok) {
          const { status } = (await res.json()) as { status: 'pending' | 'paid' | 'cancelled' };
          if (status === 'paid' || status === 'cancelled') {
            doneRef.current = true;
            setState(status);
            if (status === 'paid') {
              await refresh();
              router.refresh();
            }
            return;
          }
        }
      } catch {
        /* transient network error: keep polling */
      }
      if (Date.now() - startedAt > GIVE_UP_MS) {
        doneRef.current = true;
        setState('timeout');
        return;
      }
      timer = setTimeout(tick, POLL_MS);
    }

    void tick();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
    // refresh/router are stable enough; re-running on them would restart the poll.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderCode, enabled]);

  return state;
}
