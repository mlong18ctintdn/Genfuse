'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

type Ok<T> = { ok: true } & T;
type Err = { ok: false; error: string };

type RpcResult = { ok: boolean; error?: string; family_name?: string; family_code?: string };

async function call(fn: 'switch_to_family' | 'create_family_for_member', args: Record<string, string>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'UNAUTHENTICATED' } as Err;
  const { data, error } = await supabase.rpc(fn, args);
  if (error || !data) return { ok: false, error: 'GENERIC' } as Err;
  const r = data as RpcResult;
  if (!r.ok) return { ok: false, error: r.error ?? 'GENERIC' } as Err;
  revalidatePath('/', 'layout');
  return { ok: true, familyName: r.family_name ?? '', code: r.family_code ?? '' } as Ok<{ familyName: string; code: string }>;
}

/** Join another family by its 6-character code (24h limit and member cap are enforced in SQL). */
export async function switchFamily(code: string) {
  const parsed = z.string().trim().regex(/^[A-Za-z0-9]{6}$/).safeParse(code);
  if (!parsed.success) return { ok: false, error: 'INVALID_CODE' } as Err;
  return call('switch_to_family', { p_code: parsed.data.toUpperCase() });
}

export async function createNewFamily(name: string) {
  const parsed = z.string().trim().min(1).max(60).safeParse(name);
  if (!parsed.success) return { ok: false, error: 'BAD_REQUEST' } as Err;
  return call('create_family_for_member', { p_name: parsed.data });
}
