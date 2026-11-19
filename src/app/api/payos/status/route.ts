import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPayOS, type LinkInfo } from '@/lib/payos';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Polled by the checkout modal. The database is the source of truth (the webhook
 * flips the order to 'paid'). If the webhook is late, we ask PayOS directly and
 * apply the same idempotent activation, so the customer never waits on a retry.
 */
export async function GET(req: Request) {
  const orderCode = Number(new URL(req.url).searchParams.get('orderCode'));
  if (!Number.isSafeInteger(orderCode) || orderCode <= 0) return Response.json({ error: 'BAD_REQUEST' }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'UNAUTHENTICATED' }, { status: 401 });

  // RLS: a user only sees their own family's orders.
  const { data: tx } = await supabase
    .from('transactions')
    .select('status, amount')
    .eq('order_code', orderCode)
    .maybeSingle();
  if (!tx) return Response.json({ error: 'NOT_FOUND' }, { status: 404 });

  let status: string = tx.status;

  if (status === 'pending') {
    const payos = getPayOS();
    if (payos) {
      try {
        const info = (await payos.paymentRequests.get(orderCode)) as unknown as LinkInfo;
        const admin = createAdminClient();

        if (info.status === 'PAID') {
          await admin.rpc('activate_premium_from_order', { p_order_code: orderCode, p_amount: tx.amount });
        } else if (info.status === 'CANCELLED' || info.status === 'EXPIRED') {
          await admin.from('transactions').update({ status: 'cancelled' }).eq('order_code', orderCode).eq('status', 'pending');
        }

        const { data: fresh } = await admin.from('transactions').select('status').eq('order_code', orderCode).single();
        status = fresh?.status ?? status;
      } catch (e) {
        console.error('[payos] status check failed', e);
      }
    }
  }

  return Response.json({ status });
}
