import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

export type CreditResult = {
  ok: boolean;
  premium: boolean;
  /** null for premium families (unlimited). */
  creditsRemaining: number | null;
  reason?: 'NO_CREDITS' | 'FAMILY_NOT_FOUND' | 'ERROR';
};

export type FamilyAccess = {
  premium: boolean;
  creditsRemaining: number;
  /** Free game starts left (chore wheel spin, Ô Ăn Quan game). */
  gameUsesRemaining: number;
  premiumExpiresAt: string | null;
};

/** Read-only check used BEFORE starting an AI stream. Does not consume anything. */
export async function getFamilyAccess(familyId: string): Promise<FamilyAccess | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('families')
    .select('credits_remaining, free_game_uses, subscription_tier, premium_expires_at')
    .eq('id', familyId)
    .single();

  if (error || !data) return null;

  const premium =
    data.subscription_tier === 'premium' &&
    (data.premium_expires_at === null || new Date(data.premium_expires_at).getTime() > Date.now());

  return {
    premium,
    creditsRemaining: data.credits_remaining,
    gameUsesRemaining: data.free_game_uses,
    premiumExpiresAt: data.premium_expires_at,
  };
}

/**
 * Atomically spends ONE credit via the SQL function public.consume_family_credit
 * (single UPDATE ... WHERE credits_remaining > 0). Premium families are not charged.
 * Only callable with the service-role key, i.e. only from trusted server code.
 */
export async function consumeCredit(familyId: string): Promise<CreditResult> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc('consume_family_credit', { p_family_id: familyId });

  if (error || !data) {
    console.error('[credits] consume_family_credit failed', error);
    return { ok: false, premium: false, creditsRemaining: null, reason: 'ERROR' };
  }

  const r = data as {
    ok: boolean;
    premium: boolean;
    credits_remaining: number | null;
    reason?: 'NO_CREDITS' | 'FAMILY_NOT_FOUND';
  };

  return {
    ok: r.ok,
    premium: r.premium,
    creditsRemaining: r.credits_remaining,
    reason: r.reason,
  };
}

export type GameUseResult = {
  ok: boolean;
  premium: boolean;
  gameUsesRemaining: number | null;
  reason?: 'NO_GAME_USES' | 'ERROR';
};

/** Atomically spends ONE free game use (SQL consume_family_game_use). Premium is not charged. */
export async function consumeGameUse(familyId: string): Promise<GameUseResult> {
  const { data, error } = await createAdminClient().rpc('consume_family_game_use', { p_family_id: familyId });
  if (error || !data) {
    console.error('[credits] consume_family_game_use failed', error);
    return { ok: false, premium: false, gameUsesRemaining: null, reason: 'ERROR' };
  }
  const r = data as { ok: boolean; premium: boolean; free_game_uses: number | null; reason?: 'NO_GAME_USES' };
  return { ok: r.ok, premium: r.premium, gameUsesRemaining: r.free_game_uses, reason: r.reason };
}

/** Read-only: may this family start a game right now? */
export async function canStartGame(familyId: string): Promise<boolean> {
  const a = await getFamilyAccess(familyId);
  return !!a && (a.premium || a.gameUsesRemaining > 0);
}
