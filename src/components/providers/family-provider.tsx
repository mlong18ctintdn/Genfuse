'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import type { Role } from '@/lib/ai/prompts';

export type FamilyMember = { id: string; display_name: string; role: Role };

export const ACTIVITY_KINDS = ['memory', 'reminderDone', 'spin', 'oaqRoom', 'oaqJoin', 'chores'] as const;
export type ActivityKind = (typeof ACTIVITY_KINDS)[number];

type Handler = (payload: any, event: string) => void;

type Ctx = {
  familyId: string;
  meId: string;
  meName: string;
  members: FamilyMember[];
  online: Set<string>;
  connected: boolean;
  /** Broadcast to every device of the family (including this one: self=true). */
  send: (event: string, payload: Record<string, unknown>) => Promise<void>;
  /** Subscribe to one broadcast event. Returns the unsubscribe function. */
  on: (event: string, handler: Handler) => () => void;
  /** Shows a small toast on the OTHER members' screens. */
  announce: (kind: ActivityKind, params?: Record<string, string>) => void;
};

const FamilyContext = createContext<Ctx | null>(null);

export function useFamily() {
  const ctx = useContext(FamilyContext);
  if (!ctx) throw new Error('useFamily must be used inside FamilyRealtimeProvider');
  return ctx;
}

/**
 * One private Realtime channel per family: `family:{family_id}`.
 * - Presence: who has the app open right now.
 * - Broadcast: live events (activity toasts, chore wheel spins, Ô Ăn Quan moves).
 * Access is enforced by the realtime.messages policies in migration 003.
 */
export function FamilyRealtimeProvider({
  familyId,
  meId,
  meName,
  members,
  children,
}: {
  familyId: string;
  meId: string;
  meName: string;
  members: FamilyMember[];
  children: React.ReactNode;
}) {
  const router = useRouter();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const handlers = useRef(new Map<string, Set<Handler>>());
  const refreshed = useRef(new Set<string>());
  const memberIds = useRef(new Set<string>());
  const [online, setOnline] = useState<Set<string>>(new Set([meId]));
  const [connected, setConnected] = useState(false);

  memberIds.current = new Set(members.map((m) => m.id));

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    let channel: RealtimeChannel | null = null;

    (async () => {
      // Private channels need the user's JWT on the socket.
      await supabase.realtime.setAuth();
      if (cancelled) return;

      channel = supabase.channel(`family:${familyId}`, {
        config: { private: true, broadcast: { self: true }, presence: { key: meId } },
      });
      channelRef.current = channel;

      channel
        .on('broadcast', { event: '*' }, (msg: { event: string; payload: unknown }) => {
          handlers.current.get(msg.event)?.forEach((h) => h(msg.payload, msg.event));
        })
        .on('presence', { event: 'sync' }, () => {
          const ids = new Set(Object.keys(channel!.presenceState()));
          ids.add(meId);
          setOnline(ids);
          // A member we don't know yet (just joined): reload the member list once.
          for (const id of ids) {
            if (!memberIds.current.has(id) && !refreshed.current.has(id)) {
              refreshed.current.add(id);
              router.refresh();
            }
          }
        })
        .subscribe(async (status) => {
          if (cancelled) return;
          setConnected(status === 'SUBSCRIBED');
          if (status === 'SUBSCRIBED') {
            await channel!.track({ name: meName, at: Date.now() });
            handlers.current.get('__connected')?.forEach((h) => h(null, '__connected'));
          }
        });
    })();

    return () => {
      cancelled = true;
      setConnected(false);
      channelRef.current = null;
      if (channel) void supabase.removeChannel(channel);
    };
    // router is stable; meName changes only on a profile edit and re-tracking is not needed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [familyId, meId]);

  const send = useCallback(async (event: string, payload: Record<string, unknown>) => {
    const ch = channelRef.current;
    if (!ch) return;
    await ch.send({ type: 'broadcast', event, payload });
  }, []);

  const on = useCallback((event: string, handler: Handler) => {
    let set = handlers.current.get(event);
    if (!set) handlers.current.set(event, (set = new Set()));
    set.add(handler);
    return () => {
      set!.delete(handler);
    };
  }, []);

  const announce = useCallback(
    (kind: ActivityKind, params: Record<string, string> = {}) => {
      void send('activity', { kind, by: meId, name: meName, params });
    },
    [send, meId, meName],
  );

  const value = useMemo<Ctx>(
    () => ({ familyId, meId, meName, members, online, connected, send, on, announce }),
    [familyId, meId, meName, members, online, connected, send, on, announce],
  );

  return <FamilyContext.Provider value={value}>{children}</FamilyContext.Provider>;
}
