'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getFamilyAccess, FREE_MEMORY_LIMIT } from '@/lib/credits';
import type { Role } from '@/lib/ai/prompts';

const inputSchema = z.object({
  title: z.string().trim().max(200).optional(),
  content: z.string().trim().max(10000).optional(),
  mediaPath: z.string().max(300).nullable().optional(),
  mediaType: z.enum(['text', 'image', 'audio']),
  memoryDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  unlockDate: z.string().datetime().nullable().optional(),
  parentId: z.string().uuid().nullable().optional(),
});

export type CreateMemoryInput = z.infer<typeof inputSchema>;

export type CreateMemoryResult =
  | {
      ok: true;
      memory: {
        id: string;
        title: string;
        summary: string | null;
        emotion: string | null;
        followUp: string | null;
        aiUsed: boolean;
      };
    }
  | { ok: false; error: string };

const INVITE_FOLLOW_UP: Record<Role, string> = {
  grandparent: 'Con cháu trong nhà có kỷ niệm nào tương tự như câu chuyện này không, cùng chia sẻ nhé?',
  parent: 'Ông bà và các con thấy khoảnh khắc này của gia đình mình thế nào?',
  child: 'Hồi bằng tuổi con bây giờ, ông bà và bố mẹ đã trải qua chuyện này như thế nào ạ?',
};

export async function createMemory(raw: CreateMemoryInput): Promise<CreateMemoryResult> {
  const parsed = inputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'BAD_REQUEST' };
  const input = parsed.data;
  if (!input.title && !input.content && !input.mediaPath) return { ok: false, error: 'BAD_REQUEST' };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'UNAUTHENTICATED' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('family_id, display_name, role, preferred_lang')
    .eq('id', user.id)
    .single();
  if (!profile) return { ok: false, error: 'NO_FAMILY' };

  const familyId = profile.family_id as string;
  const role = profile.role as Role;

  if (input.mediaPath && (!input.mediaPath.startsWith(`${familyId}/`) || input.mediaPath.includes('..'))) {
    return { ok: false, error: 'BAD_REQUEST' };
  }
  if (input.unlockDate && new Date(input.unlockDate).getTime() <= Date.now()) {
    return { ok: false, error: 'DATE_IN_PAST' };
  }

  const access = await getFamilyAccess(familyId);
  if (!access) return { ok: false, error: 'NO_FAMILY' };

  if (!access.premium) {
    const { count } = await createAdminClient()
      .from('memories')
      .select('id', { count: 'exact', head: true })
      .eq('family_id', familyId);
    if ((count ?? 0) >= FREE_MEMORY_LIMIT) return { ok: false, error: 'FREE_MEMORY_LIMIT_REACHED' };
  }

  let ai: { title: string; emotionTag: string; summary: string; followUp: string } | null = null;
  if (input.content || input.title) {
    const cleanText = (input.content ?? input.title ?? '').trim();
    ai = {
      title: (input.title || cleanText.slice(0, 48) || 'Kỷ niệm gia đình').slice(0, 80),
      emotionTag: 'Ấm áp',
      summary: cleanText.slice(0, 180),
      followUp: INVITE_FOLLOW_UP[role],
    };
  }

  const finalTitle = (input.title || ai?.title || input.content?.slice(0, 60) || '…').slice(0, 200);
  const { data: saved, error } = await supabase
    .from('memories')
    .insert({
      family_id: familyId,
      author_id: user.id,
      title: finalTitle,
      content: input.content || null,
      media_url: input.mediaPath ?? null,
      media_type: input.mediaType,
      ai_summary: ai?.summary ?? null,
      ai_emotion_tag: ai?.emotionTag ?? null,
      ai_follow_up: ai?.followUp ?? null,
      memory_date: input.memoryDate ?? null,
      unlock_date: input.unlockDate ?? null,
      parent_memory_id: input.parentId ?? null,
    })
    .select('id, title')
    .single();

  if (error || !saved) {
    return { ok: false, error: error?.message?.includes('FREE_MEMORY_LIMIT_REACHED') ? 'FREE_MEMORY_LIMIT_REACHED' : 'GENERIC' };
  }

  revalidatePath('/', 'layout');
  return {
    ok: true,
    memory: {
      id: saved.id,
      title: saved.title,
      summary: ai?.summary ?? null,
      emotion: ai?.emotionTag ?? null,
      followUp: ai?.followUp ?? null,
      aiUsed: !!ai,
    },
  };
}
