import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/session';
import { RemindersClient, type Member, type Reminder } from '@/components/reminders/reminders-client';

export async function generateMetadata() {
  const t = await getTranslations();
  return { title: t('reminders.title') };
}

export default async function RemindersPage() {
  const t = await getTranslations();
  const { profile } = await getSession();
  const me = profile!;
  const supabase = await createClient();

  const [{ data: members }, { data: reminders }] = await Promise.all([
    supabase.from('profiles').select('id, display_name, role').order('created_at', { ascending: true }),
    supabase
      .from('reminders')
      .select('id, target_user_id, created_by, title, remind_time, is_completed')
      .order('remind_time', { ascending: true })
      .limit(200),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold">{t('reminders.title')}</h1>
      <RemindersClient
        familyId={me.family_id}
        me={{ id: me.id, display_name: me.display_name, role: me.role }}
        members={(members ?? []) as Member[]}
        initial={(reminders ?? []) as Reminder[]}
      />
    </div>
  );
}
