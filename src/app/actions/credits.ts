'use server';

import { createClient } from '@/lib/supabase/server';
import { consumeCredit, getFamilyAccess, type CreditResult, type FamilyAccess } from '@/lib/credits';

/**
 * The family is ALWAYS derived from the signed-in session on the server.
 * A caller can never pass a family id, so nobody can spend another family's credits.
 */
async function resolveFamilyId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('family_id')
    .eq('id', user.id)
    .single();

  return profile?.family_id ?? null;
}

/**
 * Atomically spend one AI credit for the caller's family.
 * Premium families are not charged. The /api/chat route calls the same
 * underlying function (consumeCredit) once the AI stream has produced its first token.
 */
export async function consumeFamilyCredit(): Promise<CreditResult> {
  const familyId = await resolveFamilyId();
  if (!familyId) {
    return { ok: false, premium: false, creditsRemaining: null, reason: 'FAMILY_NOT_FOUND' };
  }
  return consumeCredit(familyId);
}

/** Initial value for the header badge (Server Component / SSR). Live updates come from Supabase Realtime. */
export async function getCreditStatus(): Promise<FamilyAccess | null> {
  const familyId = await resolveFamilyId();
  if (!familyId) return null;
  return getFamilyAccess(familyId);
}
