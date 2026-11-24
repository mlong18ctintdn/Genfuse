import { createAdminClient } from '@/lib/supabase/admin';
import { getPayOS } from '@/lib/payos';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') return Response.json({ success: false }, { status: 400 });

  const payos = getPayOS();
  if (!payos) return Response.json({ success: false }, { status: 503 });

  let data: { orderCode: number; amount: number; code?: string };
  try {
    data = (await payos.webhooks.verify(body as Parameters<typeof payos.webhooks.verify>[0])) as unknown as typeof data;
  } catch {
    return Response.json({ success: false }, { status: 400 });
  }

  const b = body as { success?: boolean; code?: string };
  const paid = b.success === true && b.code === '00' && (data.code === undefined || data.code === '00');

  if (paid) {
    const admin = createAdminClient();
    const { error } = await admin.rpc('activate_premium_from_order', {
      p_order_code: data.orderCode,
      p_amount: data.amount,
    });
    if (error) {
      console.error('[payos] activation failed', error);
      return Response.json({ success: false }, { status: 500 });
    }

    const { data: orderRow } = await admin
      .from('payment_orders')
      .select('family_id')
      .eq('order_code', data.orderCode)
      .maybeSingle();

    if (orderRow?.family_id) {
      const { data: fam } = await admin
        .from('families')
        .select('pro_seats')
        .eq('id', orderRow.family_id)
        .single();
      await admin
        .from('families')
        .update({ pro_seats: (fam?.pro_seats ?? 0) + 1 })
        .eq('id', orderRow.family_id);
    }
  }

  return Response.json({ success: true });
}
