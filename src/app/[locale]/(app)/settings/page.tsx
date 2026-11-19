import { getTranslations } from 'next-intl/server';
import { getFamily, getSession, isPremium } from '@/lib/session';
import { SettingsForm } from '@/components/settings/settings-form';

export async function generateMetadata() {
  const t = await getTranslations();
  return { title: t('nav.settings') };
}

export default async function SettingsPage() {
  const t = await getTranslations();
  const { profile } = await getSession();
  const me = profile!;
  const family = await getFamily(me.family_id);

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-3xl font-extrabold">{t('nav.settings')}</h1>
      <SettingsForm
        initial={{ displayName: me.display_name, uiMode: me.ui_mode }}
        familyName={family?.name ?? ''}
        familyCode={family?.family_code ?? ''}
        premium={family ? isPremium(family) : false}
      />
    </div>
  );
}
