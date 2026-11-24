import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

export const FREE_MEMORY_LIMIT = 15;
export const SEATS_PER_PRO_PLAN = 6;

export type CreditResult = {
  ok: boolean;
  premium: boolean;
  /** null for premium families (unlimited). */
  creditsRemaining: number | null;
  reason?: 'NO_CREDITS' | 'FAMILY_NOT_FOUND' | 'ERROR';
};

export type FamilyAccess = {
  premium: boolean;
  rawProSeats: number;
  memberCount: number;
  requiredSeats: number;
  needsExtraSeat: boolean;
  creditsRemaining: number;
  /** Free game starts left (chore wheel spin, Ô Ăn Quan game). */
  gameUsesRemaining: number;
  premiumExpiresAt: string | null;
  memoriesCount: number;
  canAddMemory: boolean;
};

/** Read-only check used BEFORE starting an AI stream or adding a memory. Does not consume anything. */
export async function getFamilyAccess(familyId: string): Promise<FamilyAccess | null> {
  const admin = createAdminClient();

  const [{ data, error }, { count: memberCount }, { count: memoriesCount }] = await Promise.all([
    admin
      .from('families')
      .select('credits_remaining, free_game_uses, subscription_tier, premium_expires_at, pro_seats')
      .eq('id', familyId)
      .single(),
    admin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('family_id', familyId),
    admin
      .from('memories')
      .select('id', { count: 'exact', head: true })
      .eq('family_id', familyId),
  ]);

  if (error || !data) return null;

  const isNotExpired =
    data.premium_expires_at === null || new Date(data.premium_expires_at).getTime() > Date.now();
  const isTierPremium = data.subscription_tier === 'premium' && isNotExpired;

  const activeSeats = isTierPremium ? Math.max(data.pro_seats ?? 0, 1) : 0;
  const members = memberCount ?? 1;
  const memories = memoriesCount ?? 0;

  // Cứ 1 gói Pro bao phủ tối đa 6 thành viên; từ người thứ 7 trở đi cần thêm 1 gói Pro
  const requiredSeats = Math.max(1, Math.ceil(members / SEATS_PER_PRO_PLAN));
  const premium = activeSeats >= requiredSeats;
  const needsExtraSeat = activeSeats > 0 && activeSeats < requiredSeats;

  return {
    premium,
    rawProSeats: activeSeats,
    memberCount: members,
    requiredSeats,
    needsExtraSeat,
    creditsRemaining: data.credits_remaining,
    gameUsesRemaining: data.free_game_uses,
    premiumExpiresAt: data.premium_expires_at,
    memoriesCount: memories,
    canAddMemory: premium || memories < FREE_MEMORY_LIMIT,
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
