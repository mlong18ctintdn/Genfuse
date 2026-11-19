import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold', {
  variants: {
    tone: {
      neutral: 'bg-muted text-foreground',
      gran: 'bg-gran/20 text-gran-ink',
      par: 'bg-par/15 text-par-ink',
      kid: 'bg-kid/15 text-kid-ink',
      success: 'bg-success/15 text-success',
      danger: 'bg-destructive/15 text-destructive',
    },
  },
  defaultVariants: { tone: 'neutral' },
});

export function Badge({
  className,
  tone,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

export const roleTone = { grandparent: 'gran', parent: 'par', child: 'kid' } as const;
