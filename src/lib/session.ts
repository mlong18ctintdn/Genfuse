import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import type { Lang, Role } from '@/lib/ai/prompts';
import type { UiMode } from '@/lib/ui-mode';

export type Profile = {
  id: string;
  family_id: string;
  display_name: string;
  role: Role;
  ui_mode: UiMode;
  preferred_lang: Lang;
  avatar_url: string | null;
};

export type Family = {
  id: string;
  name: string;
  family_code: string;
  credits_remaining: number;
  subscription_tier: 'free' | 'premium';
  premium_expires_at: string | null;
};

/** Deduplicated per request, so layouts and pages can all call it. */
export const getSession = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null as Profile | null };

  const { data } = await supabase
    .from('profiles')
    .select('id, family_id, display_name, role, ui_mode, preferred_lang, avatar_url')
    .eq('id', user.id)
    .maybeSingle();

  return { user, profile: (data as Profile | null) ?? null };
});

export const getFamily = cache(async (familyId: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from('families')
    .select('id, name, family_code, credits_remaining, subscription_tier, premium_expires_at')
    .eq('id', familyId)
    .single();
  return data as Family | null;
});

export function isPremium(f: Pick<Family, 'subscription_tier' | 'premium_expires_at'>): boolean {
  return (
    f.subscription_tier === 'premium' &&
    (f.premium_expires_at === null || new Date(f.premium_expires_at).getTime() > Date.now())
  );
}
