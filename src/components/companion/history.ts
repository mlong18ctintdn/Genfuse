import type { SupabaseClient } from '@supabase/supabase-js';
import type { UIMessage } from 'ai';
import { toUiMessages } from '@/lib/chat-utils';

/** The user's own companion history (RLS only returns their own rows), oldest first. */
export async function fetchCompanionHistory(supabase: SupabaseClient, limit = 30): Promise<UIMessage[]> {
  const { data } = await supabase
    .from('ai_messages')
    .select('id, role, content')
    .eq('feature_type', 'companion')
    .order('created_at', { ascending: false })
    .limit(limit);
  return toUiMessages((data ?? []).reverse());
}
