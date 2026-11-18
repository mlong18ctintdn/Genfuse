'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;
export const DialogTitle = React.forwardRef<
  HTMLHeadingElement,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title ref={ref} className={cn('pr-10 text-xl font-bold', className)} {...props} />
));
DialogTitle.displayName = 'DialogTitle';

export const DialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn('text-muted-foreground', className)} {...props} />
));
DialogDescription.displayName = 'DialogDescription';

type ContentProps = React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
  /** "sheet" = anchored bottom-right panel (companion), "modal" = centred. */
  placement?: 'modal' | 'sheet';
};

export const DialogContent = React.forwardRef<HTMLDivElement, ContentProps>(
  ({ className, children, placement = 'modal', ...props }, ref) => {
    const t = useTranslations();
    return (
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-foreground/50 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          ref={ref}
          className={cn(
            'fixed z-50 flex max-h-[90dvh] flex-col gap-4 overflow-y-auto border border-border bg-card p-5 shadow-xl',
            placement === 'modal' &&
              'left-1/2 top-1/2 w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg',
            placement === 'sheet' &&
              'inset-x-0 bottom-0 h-[85dvh] rounded-t-lg md:inset-x-auto md:bottom-4 md:right-4 md:h-[min(40rem,85dvh)] md:w-[26rem] md:rounded-lg',
            className,
          )}
          {...props}
        >
          {children}
          <DialogPrimitive.Close
            aria-label={t('common.close')}
            className="absolute right-3 top-3 grid size-10 place-items-center rounded-full hover:bg-accent"
          >
            <X className="size-5" />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    );
  },
);
DialogContent.displayName = 'DialogContent';
