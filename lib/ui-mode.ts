export const UI_MODE_COOKIE = 'gf_ui';
export type UiMode = 'standard' | 'senior';

/** Client-side: remember the display mode so the server can render the right size on first paint. */
export function writeUiModeCookie(mode: UiMode) {
  document.cookie = `${UI_MODE_COOKIE}=${mode}; path=/; max-age=31536000; samesite=lax`;
  document.documentElement.dataset.ui = mode;
}
