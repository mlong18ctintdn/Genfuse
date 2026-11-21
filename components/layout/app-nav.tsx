'use client';

import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { NAV_ITEMS } from './nav-items';

function useActive() {
  const pathname = usePathname();
  return (href: string) => pathname === href || (href !== '/home' && pathname.startsWith(href));
}

/** Desktop sidebar: every destination, always labelled. */
export function SideNav() {
  const t = useTranslations();
  const isActive = useActive();
  return (
    <nav aria-label="Main" className="flex flex-col gap-1">
      {NAV_ITEMS.map(({ href, labelKey, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={isActive(href) ? 'page' : undefined}
          className={cn(
            'flex min-h-12 items-center gap-3 rounded-lg px-3 font-semibold transition-colors',
            isActive(href) ? 'bg-primary text-primary-foreground' : 'hover:bg-accent',
          )}
        >
          <Icon aria-hidden className="size-5 shrink-0" />
          {t(labelKey)}
        </Link>
      ))}
    </nav>
  );
}

/** Phone bottom bar: the five everyday destinations, icon + label (never icon alone). */
export function TabBar() {
  const t = useTranslations();
  const isActive = useActive();
  return (
    <nav
      aria-label="Main"
      className="pb-safe fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-card/95 backdrop-blur md:hidden"
    >
      {NAV_ITEMS.filter((i) => i.primary).map(({ href, labelKey, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={isActive(href) ? 'page' : undefined}
          className={cn(
            'flex min-h-16 flex-col items-center justify-center gap-0.5 px-1 text-[0.7rem] font-semibold leading-tight',
            isActive(href) ? 'text-primary' : 'text-muted-foreground',
          )}
        >
          <span
            className={cn(
              'grid h-8 w-14 place-items-center rounded-full transition-colors',
              isActive(href) && 'bg-accent',
            )}
          >
            <Icon aria-hidden className="size-5" />
          </span>
          <span className="max-w-full truncate">{t(labelKey)}</span>
        </Link>
      ))}
    </nav>
  );
}
