import { createUIMessageStream, createUIMessageStreamResponse } from 'ai';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { consumeCredit, getFamilyAccess } from '@/lib/credits';
import { generateDemoReply } from '@/lib/ai/mock-data';
import type { FeatureType, Lang } from '@/lib/ai/prompts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_INPUT_CHARS: Record<FeatureType, number> = {
  companion: 2000,
  translator: 500,
  scam_check: 4000,
};

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

function detectLangFromReferer(req: Request, fallback: Lang): Lang {
  const referer = req.headers.get('referer') ?? '';
  const match = referer.match(/\/(vi|en|es|zh)(?:\/|$)/);
  if (match) return match[1] as Lang;
  return fallback;
}

export async function POST(req: Request) {
  const startedAt = new Date();

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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail('UNAUTHENTICATED', 401);

  const { data: profile } = await supabase
    .from('profiles')
    .select('family_id, display_name, preferred_lang')
    .eq('id', user.id)
    .single();
  if (!profile) return fail('NO_FAMILY', 403);

  const familyId = profile.family_id as string;
  const activeLang = detectLangFromReferer(req, (profile.preferred_lang as Lang) || 'vi');

  const access = await getFamilyAccess(familyId);
  if (!access) return fail('NO_FAMILY', 403);

  // Phân tầng quyền lợi thực dụng:
  // 1. Cảnh báo lừa đảo (scam_check): LUÔN MIỄN PHÍ 100%
  // 2. Từ điển Gen Z (translator): Luôn cho tra nghĩa cơ bản, nếu hết lượt free thì khóa phần giải thích sâu & gợi ý câu đáp
  // 3. Trò chuyện AI (companion): Free 3 lượt/ngày, Pro không giới hạn
  let isDeepUnlocked = access.premium;

  if (feature === 'companion') {
    if (!access.premium) {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const { count: todayChats } = await supabase
        .from('ai_messages')
        .select('id', { count: 'exact', head: true })
        .eq('family_id', familyId)
        .eq('feature_type', 'companion')
        .eq('role', 'user')
        .gte('created_at', startOfDay.toISOString());

      if ((todayChats ?? 0) >= 3) {
        return fail('NO_CREDITS', 402);
      }
    }
  } else if (feature === 'translator') {
    if (!access.premium && access.creditsRemaining > 0) {
      await consumeCredit(familyId);
      isDeepUnlocked = true;
    }
  }

  let replyText = generateDemoReply(feature, userText, activeLang, profile.display_name);

  // Nếu ở Từ điển Gen Z bản Free đã hết lượt giải thích sâu -> giữ nguyên MEANING, khóa CONTEXT & SCRIPT
  if (feature === 'translator' && !isDeepUnlocked) {
    const meaningMatch = replyText.match(/MEANING:\n([\s\S]*?)\n\nCONTEXT:/);
    const plainMeaning = meaningMatch ? meaningMatch[1].trim() : replyText;
    const lockMsg =
      activeLang === 'vi'
        ? '🔒 Nâng cấp gói Gia Đình Pro (79k/tháng cho cả 6 người) để mở khóa phân tích tâm lý giới trẻ & gợi ý câu trả lời tình cảm!'
        : '🔒 Upgrade to Family Pro (79k/mo for up to 6 members) to unlock deep context & loving reply scripts!';
    replyText = `MEANING:\n${plainMeaning}\n\nCONTEXT:\n${lockMsg}\n\nSCRIPT:\n${lockMsg}`;
  }

  const textId = crypto.randomUUID();

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      writer.write({ type: 'start' });
      writer.write({ type: 'text-start', id: textId });

      const chunks = replyText.match(/.{1,24}/gs) ?? [replyText];
      for (const chunk of chunks) {
        writer.write({ type: 'text-delta', id: textId, delta: chunk });
        await new Promise((r) => setTimeout(r, 10));
      }

      writer.write({ type: 'text-end', id: textId });
      writer.write({ type: 'finish' });

      const admin = createAdminClient();
      await admin.from('ai_messages').insert([
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
    },
  });

  return createUIMessageStreamResponse({ stream });
}
