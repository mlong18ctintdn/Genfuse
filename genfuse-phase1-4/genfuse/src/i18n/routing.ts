import { defineRouting } from 'next-intl/routing';

export const locales = ['vi', 'en', 'zh', 'es'] as const;
export type Locale = (typeof locales)[number];

export const routing = defineRouting({
  locales,
  defaultLocale: 'vi',
  // Vietnamese lives at "/", others at "/en", "/zh", "/es"
  localePrefix: 'as-needed',
});
