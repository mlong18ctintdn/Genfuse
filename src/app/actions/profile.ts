'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { localizedPath } from '@/lib/paths';
import { UI_MODE_COOKIE } from '@/lib/ui-mode';

const langSchema = z.enum(['vi', 'en', 'zh', 'es']);

/** Keeps profile.preferred_lang in sync with the language switcher, so AI replies follow the UI. */
export async function setPreferredLang(lang: string): Promise<void> {
  const parsed = langSchema.safeParse(lang);
  if (!parsed.success) return;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return; // logged-out pages: nothing to save
  await supabase.from('profiles').update({ preferred_lang: parsed.data }).eq('id', user.id);
}

const updateSchema = z.object({
  displayName: z.string().trim().min(1).max(60),
  uiMode: z.enum(['standard', 'senior']),
  lang: langSchema,
});

export async function updateProfile(
  input: z.infer<typeof updateSchema>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'BAD_REQUEST' };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'UNAUTHENTICATED' };

  const { error } = await supabase
    .from('profiles')
    .update({
      display_name: parsed.data.displayName,
      ui_mode: parsed.data.uiMode,
      preferred_lang: parsed.data.lang,
    })
    .eq('id', user.id);
  if (error) return { ok: false, error: 'GENERIC' };

  (await cookies()).set(UI_MODE_COOKIE, parsed.data.uiMode, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  });
  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function signOut(locale: string): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(localizedPath(locale, '/'));
}
