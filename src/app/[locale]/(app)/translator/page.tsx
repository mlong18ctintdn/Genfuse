import { getTranslations } from 'next-intl/server';
import { TranslatorClient } from '@/components/translator/translator-client';

export async function generateMetadata() {
  const t = await getTranslations();
  return { title: t('translator.title') };
}

export default async function TranslatorPage() {
  const t = await getTranslations();
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-extrabold">{t('translator.title')}</h1>
        <p className="mt-1 max-w-[60ch] text-muted-foreground">{t('translator.subtitle')}</p>
      </header>
      <TranslatorClient />
    </div>
  );
}
