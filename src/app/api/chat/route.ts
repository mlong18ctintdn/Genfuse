import { streamText } from 'ai';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { consumeCredit, getFamilyAccess } from '@/lib/credits';
import { getChatModel } from '@/lib/ai/model';
import { buildSystemPrompt, type FeatureType, type Lang, type Role } from '@/lib/ai/prompts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_INPUT_CHARS: Record<FeatureType, number> = {
  companion: 2000,
  translator: 500,
  scam_check: 4000,
};
const HISTORY_LIMIT = 16; // previous companion messages replayed to the model
const RATE_LIMIT_PER_MINUTE = 12; // protects premium (unlimited) families from abuse

/** Accepts both AI SDK v5 UI messages ({ parts }) and plain { content } messages. */
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

/** Error codes map 1:1 to keys under "errors" in messages/*.json. */
function fail(code: string, status: number) {
  return Response.json({ error: code }, { status });
}

export async function POST(req: Request) {
  const startedAt = new Date();

  // 1. Validate input -------------------------------------------------------
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

  // 2. Authenticate + resolve family (never trust ids from the client) -------
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail('UNAUTHENTICATED', 401);

  const { data: profile } = await supabase
    .from('profiles')
    .select('family_id, display_name, role, preferred_lang, families(name)')
    .eq('id', user.id)
    .single();
  if (!profile) return fail('NO_FAMILY', 403);

  const familyId = profile.family_id as string;
  const role = profile.role as Role;
  const lang = profile.preferred_lang as Lang;
  const familyRow = profile.families as { name: string } | { name: string }[] | null;
  const familyName = Array.isArray(familyRow) ? familyRow[0]?.name : familyRow?.name;

  // 3. Soft rate limit -------------------------------------------------------
  const { count: recent } = await supabase
    .from('ai_messages')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('role', 'user')
    .gte('created_at', new Date(Date.now() - 60_000).toISOString());
  if ((recent ?? 0) >= RATE_LIMIT_PER_MINUTE) return fail('RATE_LIMITED', 429);

  // 4. Pre-flight credit check (read-only; nothing is spent yet) -------------
  const access = await getFamilyAccess(familyId);
  if (!access) return fail('NO_FAMILY', 403);
  if (!access.premium && access.creditsRemaining <= 0) return fail('NO_CREDITS', 402);

  // 5. Pick provider ---------------------------------------------------------
  const chat = getChatModel();
  if (!chat) return fail('AI_NOT_CONFIGURED', 503);

  // 6. Build context: persistent history + family memories (companion only) ---
  let history: { role: 'user' | 'assistant'; content: string }[] = [];
  let memoryContext: string | undefined;

  if (feature === 'companion') {
    const [{ data: rows }, { data: mems }] = await Promise.all([
      supabase
        .from('ai_messages')
        .select('role, content')
        .eq('user_id', user.id)
        .eq('feature_type', 'companion')
        .order('created_at', { ascending: false })
        .limit(HISTORY_LIMIT),
      // RLS already hides other families' data and still-sealed Time Capsules.
      supabase
        .from('memories')
        .select('title, ai_summary, content')
        .order('created_at', { ascending: false })
        .limit(6),
    ]);

    history = (rows ?? [])
      .reverse()
      .map((r) => ({ role: r.role as 'user' | 'assistant', content: String(r.content).slice(0, 2000) }));

    const lines = (mems ?? [])
      .map((m) => {
        const snippet = String(m.ai_summary ?? m.content ?? '').replace(/\s+/g, ' ').slice(0, 200);
        return `- ${String(m.title).replace(/\s+/g, ' ').slice(0, 80)}${snippet ? `: ${snippet}` : ''}`;
      })
      .join('\n');
    memoryContext = lines || undefined;
  }

  const system = buildSystemPrompt({
    feature,
    role,
    lang,
    displayName: profile.display_name,
    familyName,
    memoryContext,
  });

  // Scam checker: wrap untrusted text so it cannot masquerade as instructions.
  const modelInput =
    feature === 'scam_check'
      ? `<suspicious_content>\n${userText.replaceAll('</suspicious_content>', '')}\n</suspicious_content>`
      : userText;

  // 7. Stream. Spend the credit only once the first token has arrived ---------
  const spendAbort = new AbortController();
  let spendStarted = false;
  let spent = false;

  const result = streamText({
    model: chat.model,
    system,
    messages: [...history, { role: 'user' as const, content: modelInput }],
    temperature: feature === 'scam_check' ? 0.2 : feature === 'translator' ? 0.6 : 0.8,
    maxOutputTokens: feature === 'companion' ? 700 : 900,
    abortSignal: AbortSignal.any([req.signal, spendAbort.signal]),
    // Gemini 2.5 "thinking" adds latency; chat replies don't need it.
    providerOptions: chat.provider === 'google' ? { google: { thinkingConfig: { thinkingBudget: 0 } } } : undefined,

    onChunk: async ({ chunk }) => {
      const type = (chunk as { type: string }).type;
      if (spendStarted || (type !== 'text' && type !== 'text-delta')) return;
      spendStarted = true;

      const res = await consumeCredit(familyId); // atomic UPDATE in Postgres
      if (res.ok) {
        spent = true;
      } else {
        // Lost a race with a parallel request, or DB error: stop streaming, fail closed.
        spendAbort.abort();
      }
    },

    onFinish: async ({ text }) => {
      if (!spent || !text.trim()) return;
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
          content: text,
          created_at: new Date().toISOString(),
        },
      ]);
      if (error) console.error('[chat] failed to persist messages', error);
    },

    onError: ({ error }) => {
      console.error('[chat] stream error', error);
    },
  });

  return result.toUIMessageStreamResponse({
    onError: () => 'AI_STREAM_ERROR',
  });
}
