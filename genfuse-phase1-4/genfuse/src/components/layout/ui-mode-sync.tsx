'use client';

import { useEffect } from 'react';
import { UI_MODE_COOKIE, writeUiModeCookie, type UiMode } from '@/lib/ui-mode';

/** Signed in on a new device? Make the cookie match the profile so the next page load is rendered at the right size. */
export function UiModeSync({ mode }: { mode: UiMode }) {
  useEffect(() => {
    const current = document.cookie.split('; ').find((c) => c.startsWith(`${UI_MODE_COOKIE}=`));
    if (current?.split('=')[1] !== mode) writeUiModeCookie(mode);
  }, [mode]);
  return null;
}
