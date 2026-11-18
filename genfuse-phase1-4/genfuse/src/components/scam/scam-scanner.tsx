'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Check, CircleHelp, ShieldAlert, ShieldCheck, TriangleAlert, Volume2, VolumeX, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { UpgradeGate } from '@/components/premium/upgrade-gate';
import { useSpeech } from '@/lib/hooks/use-speech';
import { parseRisk, parseSections, safeErrorKey, toBullets, type Risk } from '@/lib/chat-utils';
import type { Lang } from '@/lib/ai/prompts';
import { cn } from '@/lib/utils';
import { useOneShotAi } from '@/components/translator/ai-stream';

// Colour AND icon AND words: the verdict never relies on colour alone.
const RISK_STYLE: Record<Risk, { box: string; icon: typeof ShieldAlert }> = {
  HIGH: { box: 'border-destructive bg-destructive/10 text-destructive', icon: ShieldAlert },
  MEDIUM: { box: 'border-gran bg-gran/20 text-gran-ink', icon: TriangleAlert },
  LOW: { box: 'border-success bg-success/10 text-success', icon: ShieldCheck },
  UNKNOWN: { box: 'border-input bg-muted text-foreground', icon: CircleHelp },
};

export function ScamScanner() {
  const t = useTranslations();
  const locale = useLocale() as Lang;
  const speech = useSpeech(locale);
  const ai = useOneShotAi('scam_check');
  const [text, setText] = useState('');

  const risk = parseRisk(ai.text);
  const body = ai.text.replace(/^\s*RISK:\s*\w+\s*/i, '');
  const sections = parseSections(body, ['WHY', 'DO', 'DONT']);
  const RiskIcon = risk ? RISK_STYLE[risk].icon : ShieldAlert;

  function readAloud() {
    if (!risk) return;
    const parts = [t(`scamShield.scanner.risk.${risk}`), sections.WHY, ...toBullets(sections.DO)];
    speech.speak(parts.filter(Boolean).join('. '));
  }

  return (
    <section aria-labelledby="scanner-title" className="space-y-4 rounded-lg border-2 border-primary bg-card p-5">
      <h2 id="scanner-title" className="flex items-center gap-2 text-xl font-bold">
        <ShieldCheck aria-hidden className="size-6" />
        {t('scamShield.scanner.title')}
      </h2>

      {!ai.canUseAi ? (
        <UpgradeGate />
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ai.run(text);
          }}
          className="space-y-3"
        >
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('scamShield.scanner.placeholder')}
            aria-label={t('scamShield.scanner.placeholder')}
            rows={4}
            maxLength={4000}
          />
          <Button type="submit" size="lg" disabled={ai.busy || !text.trim()}>
            {ai.busy ? t('common.loading') : t('scamShield.scanner.check')}
          </Button>
        </form>
      )}

      {ai.errorCode && ai.errorCode !== 'NO_CREDITS' && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 font-medium text-destructive">
          {t(`errors.${safeErrorKey(ai.errorCode)}`)}
        </p>
      )}

      {(risk || ai.waiting) && (
        <div aria-live="polite" className="space-y-4">
          {risk && (
            <p className={cn('flex items-center gap-3 rounded-lg border-2 p-4 text-xl font-extrabold', RISK_STYLE[risk].box)}>
              <RiskIcon aria-hidden className="size-8 shrink-0" />
              {t(`scamShield.scanner.risk.${risk}`)}
            </p>
          )}

          {sections.WHY && (
            <div>
              <h3 className="font-bold">{t('scamShield.scanner.why')}</h3>
              <p className="mt-1 whitespace-pre-wrap">{sections.WHY}</p>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            {sections.DO && (
              <div className="rounded-lg bg-success/10 p-4">
                <h3 className="font-bold text-success">{t('scamShield.scanner.whatToDo')}</h3>
                <ul className="mt-2 space-y-1.5">
                  {toBullets(sections.DO).map((b) => (
                    <li key={b} className="flex gap-2">
                      <Check aria-hidden className="mt-1 size-5 shrink-0 text-success" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {sections.DONT && (
              <div className="rounded-lg bg-destructive/10 p-4">
                <h3 className="font-bold text-destructive">{t('scamShield.scanner.whatNotToDo')}</h3>
                <ul className="mt-2 space-y-1.5">
                  {toBullets(sections.DONT).map((b) => (
                    <li key={b} className="flex gap-2">
                      <X aria-hidden className="mt-1 size-5 shrink-0 text-destructive" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {ai.done && speech.canSpeak && (
            <Button variant="outline" onClick={() => (speech.speaking ? speech.stopSpeaking() : readAloud())}>
              {speech.speaking ? <VolumeX aria-hidden /> : <Volume2 aria-hidden />}
              {speech.speaking ? t('companion.stopReading') : t('companion.readAloud')}
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
