'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, Copy } from 'lucide-react';
import { Button, type ButtonProps } from '@/components/ui/button';

export function CopyButton({
  text,
  variant = 'outline',
  size = 'default',
}: {
  text: string;
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
}) {
  const t = useTranslations();
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant={variant}
      size={size}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          /* clipboard blocked: nothing to do */
        }
      }}
    >
      {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
      <span aria-live="polite">{copied ? t('common.copied') : t('common.copy')}</span>
    </Button>
  );
}
