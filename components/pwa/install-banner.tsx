'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { EllipsisVertical, Share, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FuseMark } from '@/components/brand/fuse-mark';

type Mode = 'native' | 'ios' | 'android-manual';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'gf_install_dismissed';
const DISMISS_DAYS = 14;

function wasDismissedRecently(): boolean {
  try {
    const v = localStorage.getItem(DISMISS_KEY);
    return !!v && Date.now() - Number(v) < DISMISS_DAYS * 86_400_000;
  } catch {
    return false; // storage blocked: just show the banner
  }
}

function rememberDismissal() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

// iPadOS 13+ reports itself as a Mac, so also check for a touch screen.
function isIos(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isAndroid(): boolean {
  return /Android/i.test(navigator.userAgent);
}

/**
 * Small corner card that explains "Add to Home Screen".
 *  - Android Chrome: a real "Install app" button (beforeinstallprompt).
 *  - iPhone/iPad: Safari has no install prompt, so it shows the 3 steps.
 *  - Other Android browsers: the manual steps, after a few seconds.
 * Never shown on desktop or inside the installed app; "Not now" hides it for 14 days.
 */
export function InstallBanner() {
  const t = useTranslations();
  const [mode, setMode] = useState<Mode | null>(null);
  const promptRef = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isStandalone() || wasDismissedRecently()) return;
    const ios = isIos();
    const android = isAndroid();
    if (!ios && !android) return;

    let timer: ReturnType<typeof setTimeout> | undefined;

    const onPrompt = (e: Event) => {
      e.preventDefault(); // keep the event so our own button can trigger it
      promptRef.current = e as BeforeInstallPromptEvent;
      if (timer) clearTimeout(timer);
      setMode('native');
    };
    const onInstalled = () => setMode(null);

    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);

    // Delay a little so the banner never covers the first screen the person sees.
    timer = setTimeout(() => setMode((m) => m ?? (ios ? 'ios' : 'android-manual')), ios ? 2500 : 6000);

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (!mode) return null;

  function dismiss() {
    rememberDismissal();
    setMode(null);
  }

  async function install() {
    const ev = promptRef.current;
    if (!ev) return;
    await ev.prompt();
    const { outcome } = await ev.userChoice;
    promptRef.current = null;
    if (outcome === 'accepted') setMode(null);
    else dismiss();
  }

  const steps = mode === 'ios' ? (t.raw('pwa.ios.steps') as string[]) : mode === 'android-manual' ? (t.raw('pwa.android.steps') as string[]) : [];
  const StepIcon = mode === 'ios' ? Share : EllipsisVertical;

  return (
    <aside
      aria-label={t('pwa.title')}
      className="fixed inset-x-3 top-[max(0.75rem,env(safe-area-inset-top))] z-[45] rounded-lg border border-border bg-card p-4 shadow-xl sm:left-auto sm:right-3 sm:w-96"
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label={t('common.close')}
        className="absolute right-2 top-2 grid size-10 place-items-center rounded-full hover:bg-accent"
      >
        <X aria-hidden className="size-5" />
      </button>

      <div className="flex items-start gap-3 pr-8">
        <FuseMark size={40} />
        <div>
          <h2 className="font-bold leading-snug">{t('pwa.title')}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{t('pwa.body')}</p>
        </div>
      </div>

      {steps.length > 0 && (
        // A real sequence, so numbering carries meaning here.
        <ol className="mt-3 list-decimal space-y-1.5 pl-9 pr-2 text-[0.95rem]">
          {steps.map((s, i) => (
            <li key={s}>
              {s}
              {i === 0 && <StepIcon aria-hidden className="ml-1.5 inline size-4 align-text-bottom" />}
            </li>
          ))}
        </ol>
      )}

      <div className="mt-3 flex flex-wrap justify-end gap-2">
        {mode === 'native' ? (
          <>
            <Button variant="ghost" size="sm" onClick={dismiss}>
              {t('pwa.dismiss')}
            </Button>
            <Button size="sm" onClick={install}>
              {t('pwa.install')}
            </Button>
          </>
        ) : (
          <Button variant="secondary" size="sm" onClick={dismiss}>
            {t('pwa.gotIt')}
          </Button>
        )}
      </div>
    </aside>
  );
}
