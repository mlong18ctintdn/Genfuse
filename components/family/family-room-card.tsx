'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Share2, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { switchFamily, createNewFamily } from '@/app/actions/family';
import { safeErrorKey } from '@/lib/chat-utils';
import { useFamily } from '@/components/providers/family-provider';
import { Badge, roleTone } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CopyButton } from '@/components/ui/copy-button';
import { Input, Label } from '@/components/ui/input';

export function FamilyRoomCard({ familyName, inviteCode }: { familyName: string; inviteCode: string }) {
  const t = useTranslations();
  const router = useRouter();
  const { members, online, meId, connected } = useFamily();
  const [ack, setAck] = useState(false);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  const onlineCount = members.filter((m) => online.has(m.id)).length;

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) return setError(t(`errors.${safeErrorKey(res.error)}`));
      setCode('');
      setName('');
      setAck(false);
      router.refresh();
    });
  }

  return (
    <section className="space-y-5 rounded-lg border border-border bg-card p-5" aria-labelledby="family-room">
      <div>
        <h2 id="family-room" className="text-xl font-bold">
          {familyName}
        </h2>
        <p className="text-muted-foreground">{t('family.inviteHint')}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-lg bg-gran/20 p-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gran-ink">{t('home.familyCode')}</p>
          <p className="text-4xl font-extrabold tracking-[0.25em] text-foreground" aria-label={inviteCode.split('').join(' ')}>
            {inviteCode}
          </p>
        </div>
        <CopyButton text={inviteCode} />
        {canShare && (
          <Button
            type="button"
            variant="outline"
            onClick={() => navigator.share({ title: 'GENFUSE', text: t('family.shareText', { name: familyName, code: inviteCode }) }).catch(() => {})}
          >
            <Share2 aria-hidden />
            {t('family.share')}
          </Button>
        )}
      </div>

      <div>
        <h3 className="mb-2 flex items-center gap-2 font-bold">
          <Users aria-hidden className="size-5" />
          {t('family.membersOnline', { online: onlineCount, total: members.length })}
        </h3>
        {!connected && <p className="mb-2 text-sm text-muted-foreground">{t('family.connecting')}</p>}
        <ul className="space-y-2">
          {members.map((m) => {
            const isOn = online.has(m.id);
            return (
              <li key={m.id} className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
                <span className="flex items-center gap-3">
                  <span aria-hidden className={`size-3 rounded-full ${isOn ? 'bg-success' : 'bg-muted-foreground/40'}`} />
                  <span className="font-semibold">
                    {m.display_name}
                    {m.id === meId && ` (${t('family.you')})`}
                  </span>
                  <Badge tone={roleTone[m.role]}>{t(`onboarding.roles.${m.role}`)}</Badge>
                </span>
                <span className={isOn ? 'font-semibold text-success' : 'text-muted-foreground'}>
                  {isOn ? t('family.online') : t('family.offline')}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <details className="rounded-lg border border-border p-4">
        <summary className="cursor-pointer font-bold">{t('family.changeTitle')}</summary>
        <div className="mt-4 space-y-5">
          <p className="rounded-md bg-destructive/10 p-3 text-destructive">{t('family.changeWarning')}</p>
          <label className="flex items-start gap-3 font-semibold">
            <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="mt-1 size-5 accent-primary" />
            {t('family.understand')}
          </label>

          <form
            className="space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              run(() => switchFamily(code));
            }}
          >
            <Label htmlFor="join-code">{t('family.joinLabel')}</Label>
            <div className="flex flex-wrap gap-2">
              <Input
                id="join-code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                maxLength={6}
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                className="w-48 text-center text-2xl font-bold tracking-[0.25em]"
              />
              <Button type="submit" size="lg" disabled={!ack || pending || code.length !== 6}>
                {t('family.join')}
              </Button>
            </div>
          </form>

          <form
            className="space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              run(() => createNewFamily(name));
            }}
          >
            <Label htmlFor="new-family">{t('family.createLabel')}</Label>
            <div className="flex flex-wrap gap-2">
              <Input id="new-family" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} className="min-w-0 flex-1" />
              <Button type="submit" size="lg" variant="outline" disabled={!ack || pending || !name.trim()}>
                {t('family.create')}
              </Button>
            </div>
          </form>

          {error && (
            <p role="alert" className="font-medium text-destructive">
              {error}
            </p>
          )}
        </div>
      </details>
    </section>
  );
}
