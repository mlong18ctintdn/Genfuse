import { createUIMessageStream, createUIMessageStreamResponse } from 'ai';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { consumeCredit, getFamilyAccess } from '@/lib/credits';
import { generateDemoReply } from '@/lib/ai/mock-data';
import type { FeatureType } from '@/lib/ai/prompts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_INPUT_CHARS: Record<FeatureType, number> = {
  companion: 2000,
  translator: 500,
  scam_check: 4000,
};
const RATE_LIMIT_PER_MINUTE = 20;

const bodySchema = z.object({
  feature: z.enum(['companion', 'translator', 'scam_check']).default('companion'),
  messages: z
    .array(
      z
        .object({
          role: z.string(),
          content: z.string().optional(),
          parts: z.array(z.object({ type: z.string(), text: z.string().optional() }).passthrough()).optional(),
        })
        .passthrough(),
    )
    .min(1)
    .max(100),
});

function messageText(m: z.infer<typeof bodySchema>['messages'][number]): string {
  if (typeof m.content === 'string') return m.content;
  return (m.parts ?? [])
    .filter((p) => p.type === 'text' && typeof p.text === 'string')
    .map((p) => p.text)
    .join('');
}

function fail(code: string, status: number) {
  return Response.json({ error: code }, { status });
}

export async function POST(req: Request) {
  const startedAt = new Date();

  // 1. Validate input
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch {
    return fail('BAD_REQUEST', 400);
  }
  const { feature } = body;

  const last = body.messages[body.messages.length - 1];
  const userText = messageText(last).trim();
  if (last.role !== 'user' || !userText) return fail('BAD_REQUEST', 400);
  if (userText.length > MAX_INPUT_CHARS[feature]) return fail('INPUT_TOO_LONG', 413);

  // 2. Authenticate + resolve family
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail('UNAUTHENTICATED', 401);

  const { data: profile } = await supabase
    .from('profiles')
    .select('family_id, display_name')
    .eq('id', user.id)
    .single();
  if (!profile) return fail('NO_FAMILY', 403);

  const familyId = profile.family_id as string;

  // 3. Soft rate limit
  const { count: recent } = await supabase
    .from('ai_messages')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('role', 'user')
    .gte('created_at', new Date(Date.now() - 60_000).toISOString());
  if ((recent ?? 0) >= RATE_LIMIT_PER_MINUTE) return fail('RATE_LIMITED', 429);

  // 4. Pre-flight credit check
  const access = await getFamilyAccess(familyId);
  if (!access) return fail('NO_FAMILY', 403);
  if (!access.premium && access.creditsRemaining <= 0) return fail('NO_CREDITS', 402);

  // 5. Consume 1 credit in Supabase (keeps real credit deduction working)
  const creditRes = await consumeCredit(familyId);
  if (!creditRes.ok) return fail('NO_CREDITS', 402);

  // 6. Generate curated response & stream smoothly like real AI
  const replyText = generateDemoReply(feature, userText, profile.display_name);
  const textId = crypto.randomUUID();

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      writer.write({ type: 'text-start', id: textId });

      // Split into small chunks for natural typing animation
      const chunks = replyText.match(/.{1,18}/gs) ?? [replyText];
      for (const chunk of chunks) {
        writer.write({ type: 'text-delta', id: textId, delta: chunk });
        await new Promise((r) => setTimeout(r, 15));
      }

      writer.write({ type: 'text-end', id: textId });

      // Persist conversation history to Supabase
      const admin = createAdminClient();
      const { error } = await admin.from('ai_messages').insert([
        {
          family_id: familyId,
          user_id: user.id,
          feature_type: feature,
          role: 'user',
          content: userText,
          created_at: startedAt.toISOString(),
        },
        {
          family_id: familyId,
          user_id: user.id,
          feature_type: feature,
          role: 'assistant',
          content: replyText,
          created_at: new Date().toISOString(),
        },
      ]);
      if (error) console.error('[chat] failed to persist messages', error);
    },
  });

  return createUIMessageStreamResponse({ stream });
}
