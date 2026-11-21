import 'server-only';
import { createClient } from '@supabase/supabase-js';

/**
 * Service-role client. BYPASSES Row Level Security.
 * Only for trusted server code: writing ai_messages, PayOS webhook, etc.
 * `server-only` makes the build fail if this is ever imported into client code.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
