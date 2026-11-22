'use client';

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

/**
 * Keeps a screen in sync with one table, for one family:
 *  1. Supabase Realtime `postgres_changes` (INSERT/UPDATE, filtered by family_id) calls onChange(row);
 *  2. every `intervalMs` (default 3 s) poll() runs as a safety net for dropped sockets / weak networks
 *     (only while the tab is visible), and once more on (re)connect and when the tab becomes visible.
 * Callbacks are read through refs, so re-renders never resubscribe.
 */
export function useLiveSync<Row = Record<string, unknown>>({
  table,
  familyId,
  onChange,
  poll,
  intervalMs = 3000,
  enabled = true,
}: {
  table: string;
  familyId: string;
  onChange: (row: Row) => void;
  poll: () => void | Promise<void>;
  intervalMs?: number;
  enabled?: boolean;
}) {
  const onChangeRef = useRef(onChange);
  const pollRef = useRef(poll);
  onChangeRef.current = onChange;
  pollRef.current = poll;

  useEffect(() => {
    if (!enabled) return;
    const supabase = createClient();
    const run = () => {
      if (document.visibilityState === 'visible') void pollRef.current();
    };

    const channel = supabase
      .channel(`sync-${table}-${familyId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter: `family_id=eq.${familyId}` },
        (payload) => {
          if (payload.eventType === 'DELETE') return void pollRef.current();
          onChangeRef.current(payload.new as Row);
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') void pollRef.current();
      });

    const timer = setInterval(run, intervalMs);
    document.addEventListener('visibilitychange', run);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', run);
      void supabase.removeChannel(channel);
    };
  }, [table, familyId, intervalMs, enabled]);
}
