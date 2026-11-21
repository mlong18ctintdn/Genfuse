import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { getFamily, getSession, isPremium } from '@/lib/session';
import { MemoryTreeClient } from '@/components/memory-tree/memory-tree-client';
import type { MemoryItem } from '@/components/memory-tree/types';
import type { Role } from '@/lib/ai/prompts';

export async function generateMetadata() {
  const t = await getTranslations();
  return { title: t('memoryTree.title') };
}

type Row = {
  id: string;
  author_id: string;
  title: string;
  content: string | null;
  media_url: string | null;
  media_type: 'image' | 'audio' | 'text';
  ai_summary: string | null;
  ai_emotion_tag: string | null;
  ai_follow_up: string | null;
  memory_date: string | null;
  unlock_date: string | null;
  created_at: string;
  parent_memory_id: string | null;
  profiles: { display_name: string; role: Role } | { display_name: string; role: Role }[] | null;
};

const FREE_LEAF_LIMIT = 20;

export default async function MemoryTreePage() {
  const { profile } = await getSession();
  const me = profile!;
  const family = await getFamily(me.family_id);
  const supabase = await createClient();

  // RLS: only this family's memories, and other people's sealed Time Capsules are filtered out.
  const { data } = await supabase
    .from('memories')
    .select(
      'id, author_id, title, content, media_url, media_type, ai_summary, ai_emotion_tag, ai_follow_up, memory_date, unlock_date, created_at, parent_memory_id, profiles(display_name, role)',
    )
    .order('created_at', { ascending: true })
    .limit(300);
  const rows = (data ?? []) as unknown as Row[];

  // Private bucket: hand the browser short-lived signed links, never public URLs.
  const now = Date.now();
  const paths = rows
    .filter((r) => r.media_url && !(r.unlock_date && new Date(r.unlock_date).getTime() > now))
    .map((r) => r.media_url as string);
  const signed = new Map<string, string>();
  if (paths.length) {
    const { data: urls } = await supabase.storage.from('family-media').createSignedUrls(paths, 3600);
    urls?.forEach((u) => u.path && u.signedUrl && signed.set(u.path, u.signedUrl));
  }

  const titleById = new Map(rows.map((r) => [r.id, r.title]));
  const items: MemoryItem[] = rows.map((r) => {
    const author = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
    return {
      id: r.id,
      authorId: r.author_id,
      authorName: author?.display_name ?? '…',
      authorRole: author?.role ?? 'parent',
      title: r.title,
      content: r.content,
      mediaUrl: r.media_url ? (signed.get(r.media_url) ?? null) : null,
      mediaType: r.media_type,
      aiSummary: r.ai_summary,
      aiEmotion: r.ai_emotion_tag,
      aiFollowUp: r.ai_follow_up,
      memoryDate: r.memory_date,
      unlockDate: r.unlock_date,
      createdAt: r.created_at,
      parentId: r.parent_memory_id,
      parentTitle: r.parent_memory_id ? (titleById.get(r.parent_memory_id) ?? null) : null,
    };
  });

  const premium = family ? isPremium(family) : false;

  return <MemoryTreeClient items={items} familyId={me.family_id} limitReached={!premium && items.length >= FREE_LEAF_LIMIT} />;
}
