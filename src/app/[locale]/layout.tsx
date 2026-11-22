import type { Metadata, Viewport } from 'next';
import { Be_Vietnam_Pro } from 'next/font/google';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { UI_MODE_COOKIE } from '@/lib/ui-mode';
import { SwRegister } from '@/components/pwa/sw-register';
import { InstallBanner } from '@/components/pwa/install-banner';
import '../globals.css';

// One family with full Vietnamese coverage; weights carry the hierarchy.
const font = Be_Vietnam_Pro({
  subsets: ['latin', 'latin-ext', 'vietnamese'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-body',
  display: 'swap',
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  return {
    title: { default: 'GENFUSE', template: '%s · GENFUSE' },
    description: t('meta.description'),
    applicationName: 'GENFUSE',
    metadataBase: process.env.NEXT_PUBLIC_SITE_URL ? new URL(process.env.NEXT_PUBLIC_SITE_URL) : undefined,
    // iOS Safari: "Add to Home Screen" opens full screen, without the browser bar.
    appleWebApp: { capable: true, statusBarStyle: 'default', title: 'GENFUSE' },
    // Stops iOS turning phone-number-like text into links.
    formatDetection: { telephone: false },
    icons: {
      icon: [
        { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
        { url: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
      ],
      apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    },
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Prevents the browser from zooming when a text field is tapped.
  // Pinch-to-zoom is still allowed (userScalable is left on) on iOS; see the note in README.
  maximumScale: 1,
  themeColor: '#0284C7',
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const ui = (await cookies()).get(UI_MODE_COOKIE)?.value === 'senior' ? 'senior' : 'standard';
  const messages = await getMessages();

  return (
    <html lang={locale === 'zh' ? 'zh-Hans' : locale} data-ui={ui} className={font.variable}>
      <body className="font-sans">
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
          <SwRegister />
          <InstallBanner />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
