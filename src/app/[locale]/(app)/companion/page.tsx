import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/session';
import { toUiMessages } from '@/lib/chat-utils';
import { ChatBox } from '@/components/companion/chat-box';

export async function generateMetadata() {
  const t = await getTranslations();
  return { title: t('companion.name') };
}

export default async function CompanionPage() {
  const t = await getTranslations();
  const { profile } = await getSession();
  const supabase = await createClient();

  const { data } = await supabase
    .from('ai_messages')
    .select('id, role, content')
    .eq('feature_type', 'companion')
    .order('created_at', { ascending: false })
    .limit(40);

  return (
    <div className="flex h-[calc(100dvh-13rem)] min-h-[28rem] flex-col gap-3 md:h-[calc(100dvh-9rem)]">
      <div>
        <h1 className="text-3xl font-extrabold">{t('companion.name')}</h1>
        <p className="text-muted-foreground">
          {t('companion.subtitle')} · {t('companion.privateNote')}
        </p>
      </div>
      <ChatBox
        role={profile!.role}
        displayName={profile!.display_name}
        initialMessages={toUiMessages((data ?? []).reverse())}
        autoSpeak={profile!.ui_mode === 'senior'}
      />
    </div>
  );
}
