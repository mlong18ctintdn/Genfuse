import type { Role } from '@/lib/ai/prompts';

export type MemoryItem = {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: Role;
  title: string;
  content: string | null;
  /** Short-lived signed URL (1 h) for private storage objects. */
  mediaUrl: string | null;
  mediaType: 'image' | 'audio' | 'text';
  aiSummary: string | null;
  aiEmotion: string | null;
  aiFollowUp: string | null;
  /** yyyy-mm-dd, the era the memory is about. */
  memoryDate: string | null;
  /** Future date = sealed Time Capsule. */
  unlockDate: string | null;
  createdAt: string;
  parentId: string | null;
  parentTitle: string | null;
};

export function isSealed(m: Pick<MemoryItem, 'unlockDate'>): boolean {
  return !!m.unlockDate && new Date(m.unlockDate).getTime() > Date.now();
}
