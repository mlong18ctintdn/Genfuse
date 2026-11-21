'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { QRCodeSVG } from 'qrcode.react';
import { CircleCheck, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { safeErrorKey } from '@/lib/chat-utils';
import { usePaymentStatus } from './use-payment-status';
import type { PlanId } from '@/lib/plans';

type Link = {
  orderCode: number;
  amount: number;
  checkoutUrl: string;
  qrCode: string;
  accountNumber: string | null;
  accountName: string | null;
};

const PAYMENT_ERRORS = new Set(['PAYMENT_CREATE_FAILED', 'PAYOS_NOT_CONFIGURED']);

export function CheckoutModal({
  plan,
  onClose,
}: {
  /** null = closed */
  plan: PlanId | null;
  onClose: () => void;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const [link, setLink] = useState<Link | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const startedFor = useRef<PlanId | null>(null);

  // One payment link per opening (guards React StrictMode's double effect).
  useEffect(() => {
    if (!plan) {
      startedFor.current = null;
      setLink(null);
      setError(null);
      return;
    }
    if (startedFor.current === plan) return;
    startedFor.current = plan;
    setLoading(true);
    setError(null);

    fetch('/api/payos/create-payment-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan, locale }),
    })
      .then(async (res) => {
        const body = (await res.json()) as Link & { error?: string };
        if (!res.ok) throw new Error(body.error ?? 'GENERIC');
        setLink(body);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [plan, locale]);

  const state = usePaymentStatus(link?.orderCode ?? null, !!link);
  const money = link ? new Intl.NumberFormat(locale, { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(link.amount) : '';

  return (
    <Dialog open={!!plan} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogTitle>{t('premium.payWithPayos')}</DialogTitle>
        <DialogDescription>{t('premium.payHint')}</DialogDescription>

        {loading && (
          <p role="status" className="flex items-center gap-2 py-8 font-semibold">
            <Loader2 aria-hidden className="size-5 animate-spin" />
            {t('common.loading')}
          </p>
        )}

        {error && (
          <div role="alert" className="space-y-3">
            <p className="rounded-md bg-destructive/10 px-3 py-2 font-medium text-destructive">
              {t(`errors.${PAYMENT_ERRORS.has(error) ? error : safeErrorKey(error)}`)}
            </p>
            <Button variant="outline" onClick={onClose}>
              {t('common.close')}
            </Button>
          </div>
        )}

        {link && state === 'paid' && (
          <div role="status" className="space-y-4 py-4 text-center">
            <CircleCheck aria-hidden className="mx-auto size-16 text-success" />
            <p className="text-xl font-bold">{t('premium.success')}</p>
            <Button size="lg" onClick={onClose}>
              {t('common.close')}
            </Button>
          </div>
        )}

        {link && state === 'cancelled' && (
          <div role="status" className="space-y-4">
            <p className="font-semibold">{t('premium.cancelled')}</p>
            <Button variant="outline" onClick={onClose}>
              {t('common.close')}
            </Button>
          </div>
        )}

        {link && state === 'timeout' && (
          <div role="status" className="space-y-4">
            <p className="font-semibold">{t('premium.timeout')}</p>
            <Button variant="outline" onClick={onClose}>
              {t('common.close')}
            </Button>
          </div>
        )}

        {link && state === 'pending' && (
          <div className="space-y-4">
            <p className="text-center text-3xl font-extrabold">{money}</p>
            <div className="mx-auto w-fit rounded-lg border border-border bg-white p-3">
              <QRCodeSVG value={link.qrCode} size={224} level="M" title={t('premium.scanQr')} />
            </div>
            <p className="text-center font-semibold">{t('premium.scanQr')}</p>
            {link.accountNumber && (
              <p className="text-center text-sm text-muted-foreground">
                {link.accountName} · {link.accountNumber}
              </p>
            )}
            <Button asChild variant="outline" size="lg" className="w-full">
              <a href={link.checkoutUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink aria-hidden />
                {t('premium.openPaymentPage')}
              </a>
            </Button>
            <p role="status" className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 aria-hidden className="size-4 animate-spin" />
              {t('premium.pending')}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
