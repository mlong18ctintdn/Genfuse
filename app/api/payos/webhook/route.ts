import { createAdminClient } from '@/lib/supabase/admin';
import { getPayOS } from '@/lib/payos';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * PayOS calls this when a payment changes state. Register the URL in the PayOS
 * dashboard (https://YOUR-APP/api/payos/webhook).
 *
 * Security: the body is trusted ONLY after the SDK verifies its HMAC signature
 * with the checksum key. Activation is then done by the SQL function
 * activate_premium_from_order(), which is idempotent (retries are harmless)
 * and rejects a paid amount that differs from the order.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') return Response.json({ success: false }, { status: 400 });

  const payos = getPayOS();
  if (!payos) return Response.json({ success: false }, { status: 503 });

  let data: { orderCode: number; amount: number; code?: string };
  try {
    data = (await payos.webhooks.verify(body as Parameters<typeof payos.webhooks.verify>[0])) as unknown as typeof data;
  } catch {
    return Response.json({ success: false }, { status: 400 }); // bad signature
  }

  const b = body as { success?: boolean; code?: string };
  const paid = b.success === true && b.code === '00' && (data.code === undefined || data.code === '00');

  if (paid) {
    const { error } = await createAdminClient().rpc('activate_premium_from_order', {
      p_order_code: data.orderCode,
      p_amount: data.amount,
    });
    if (error) {
      console.error('[payos] activation failed', error);
      return Response.json({ success: false }, { status: 500 }); // PayOS will retry
    }
  }

  // Also covers PayOS's "confirm webhook" test call (sample order, nothing pending → no-op).
  return Response.json({ success: true });
}
