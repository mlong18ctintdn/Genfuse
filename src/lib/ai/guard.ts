import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { getFamilyAccess } from '@/lib/credits';
import { getChatModel } from '@/lib/ai/model';
import type { Lang, Role } from '@/lib/ai/prompts';

export type AiContext = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  familyId: string;
  displayName: string;
  role: Role;
  lang: Lang;
};

function fail(code: string, status: number) {
  return Response.json({ error: code }, { status });
}

/**
 * Shared gate for AI route handlers: signed in, in a family, and the family
 * has a credit (or Premium). Read-only: nothing is spent here.
 */
export async function requireAiAccess(): Promise<{ ctx: AiContext; error?: undefined } | { ctx?: undefined; error: Response }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: fail('UNAUTHENTICATED', 401) };

  const { data: profile } = await supabase
    .from('profiles')
    .select('family_id, display_name, role, preferred_lang')
    .eq('id', user.id)
    .single();
  if (!profile) return { error: fail('NO_FAMILY', 403) };

  // Missing key: tell the user clearly before anything else (nothing is spent).
  if (!getChatModel()) return { error: fail('AI_NOT_CONFIGURED', 503) };

  const access = await getFamilyAccess(profile.family_id);
  if (!access) return { error: fail('NO_FAMILY', 403) };
  if (!access.premium && access.creditsRemaining <= 0) return { error: fail('NO_CREDITS', 402) };

  return {
    ctx: {
      supabase,
      userId: user.id,
      familyId: profile.family_id,
      displayName: profile.display_name,
      role: profile.role as Role,
      lang: profile.preferred_lang as Lang,
    },
  };
}

export { fail as aiFail };
