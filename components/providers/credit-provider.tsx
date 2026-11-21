'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getCreditStatus } from '@/app/actions/credits';

export type Access = { premium: boolean; credits: number; gameUses: number; premiumExpiresAt: string | null };

type Ctx = {
  access: Access;
  /** Re-read from the server (used after an AI call finishes, as a safety net next to Realtime). */
  refresh: () => Promise<void>;
  /** True when this family may start another AI request. */
  canUseAi: boolean;
  /** True when this family may start another game (wheel spin, Ô Ăn Quan). */
  canPlayGame: boolean;
};

const CreditContext = createContext<Ctx | null>(null);

type FamilyRow = {
  credits_remaining: number;
  free_game_uses: number;
  subscription_tier: 'free' | 'premium';
  premium_expires_at: string | null;
};

function toAccess(row: FamilyRow): Access {
  return {
    premium:
      row.subscription_tier === 'premium' &&
      (row.premium_expires_at === null || new Date(row.premium_expires_at).getTime() > Date.now()),
    credits: row.credits_remaining,
    gameUses: row.free_game_uses,
    premiumExpiresAt: row.premium_expires_at,
  };
}

/**
 * The credit counter is NEVER computed on the client. The server renders the
 * first value, Supabase Realtime pushes every change of the `families` row
 * (RLS-filtered), and refresh() re-reads through a Server Action.
 */
export function CreditProvider({
  familyId,
  initial,
  children,
}: {
  familyId: string;
  initial: Access;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [access, setAccess] = useState<Access>(initial);

  useEffect(() => setAccess(initial), [initial]);

  const refresh = useCallback(async () => {
    const s = await getCreditStatus();
    if (s) setAccess({ premium: s.premium, credits: s.creditsRemaining, gameUses: s.gameUsesRemaining, premiumExpiresAt: s.premiumExpiresAt });
    router.refresh(); // server-rendered parts pick up the new numbers without F5
  }, [router]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`family-${familyId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'families', filter: `id=eq.${familyId}` },
        (payload) => setAccess(toAccess(payload.new as FamilyRow)),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [familyId]);

  const value = useMemo<Ctx>(
    () => ({
      access,
      refresh,
      canUseAi: access.premium || access.credits > 0,
      canPlayGame: access.premium || access.gameUses > 0,
    }),
    [access, refresh],
  );

  return <CreditContext.Provider value={value}>{children}</CreditContext.Provider>;
}

export function useCredits(): Ctx {
  const ctx = useContext(CreditContext);
  if (!ctx) throw new Error('useCredits must be used inside <CreditProvider>');
  return ctx;
}
