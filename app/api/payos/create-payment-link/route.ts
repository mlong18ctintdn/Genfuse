import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPayOS, newOrderCode, type CreatedLink } from '@/lib/payos';
import { PLANS, PLAN_IDS } from '@/lib/plans';
import { localizedPath } from '@/lib/paths';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  plan: z.enum(PLAN_IDS as [keyof typeof PLANS, ...(keyof typeof PLANS)[]]),
  locale: z.enum(['vi', 'en', 'zh', 'es']).default('vi'),
});

const fail = (error: string, status: number) => Response.json({ error }, { status });

export async function POST(req: Request) {
  const body = bodySchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return fail('BAD_REQUEST', 400);
  const { plan, locale } = body.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail('UNAUTHENTICATED', 401);

  const { data: profile } = await supabase.from('profiles').select('family_id').eq('id', user.id).single();
  if (!profile) return fail('NO_FAMILY', 403);

  const payos = getPayOS();
  if (!payos) return fail('PAYOS_NOT_CONFIGURED', 503);

  const admin = createAdminClient();

  // Throttle: at most 5 unpaid orders per family per 10 minutes.
  const { count: recent } = await admin
    .from('transactions')
    .select('id', { count: 'exact', head: true })
    .eq('family_id', profile.family_id)
    .eq('status', 'pending')
    .gte('created_at', new Date(Date.now() - 10 * 60_000).toISOString());
  if ((recent ?? 0) >= 5) return fail('RATE_LIMITED', 429);

  const orderCode = newOrderCode();
  const { amount, label, itemName } = PLANS[plan];

  // Record the order BEFORE asking PayOS, so a fast webhook always finds it.
  const { error: insertError } = await admin.from('transactions').insert({
    family_id: profile.family_id,
    order_code: orderCode,
    amount,
    plan_type: plan,
    status: 'pending',
    created_by: user.id,
  });
  if (insertError) return fail('PAYMENT_CREATE_FAILED', 500);

  const site = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : new URL(req.url).origin)
  ).replace(/\/+$/, '');
  const returnUrl = `${site}${localizedPath(locale, '/premium')}?orderCode=${orderCode}`;

  try {
    const link = (await payos.paymentRequests.create({
      orderCode,
      amount,
      description: label, // PayOS limits this text to 25 characters
      items: [{ name: itemName, quantity: 1, price: amount }],
      returnUrl,
      cancelUrl: `${returnUrl}&cancel=1`,
      expiredAt: Math.floor(Date.now() / 1000) + 15 * 60,
    })) as unknown as CreatedLink;

    await admin.from('transactions').update({ payos_payment_link_id: link.paymentLinkId }).eq('order_code', orderCode);

    return Response.json({
      orderCode,
      amount,
      checkoutUrl: link.checkoutUrl,
      qrCode: link.qrCode,
      accountNumber: link.accountNumber ?? null,
      accountName: link.accountName ?? null,
    });
  } catch (e) {
    console.error('[payos] create link failed', e);
    await admin.from('transactions').update({ status: 'cancelled' }).eq('order_code', orderCode).eq('status', 'pending');
    return fail('PAYMENT_CREATE_FAILED', 502);
  }
}
