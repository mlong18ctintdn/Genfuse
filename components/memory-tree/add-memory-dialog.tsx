'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Image as ImageIcon, Mic, PenLine, Sparkles, Square, Upload } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useFamily } from '@/components/providers/family-provider';
import { createMemory, type CreateMemoryResult } from '@/app/actions/memories';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Input, Label, Textarea } from '@/components/ui/input';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

type Kind = 'text' | 'image' | 'audio';
const MAX_BYTES = 10 * 1024 * 1024;
const MAX_RECORD_MS = 3 * 60 * 1000;

function safeExt(name: string, fallback: string) {
  const ext = name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5);
  return ext && ext !== name.toLowerCase() ? ext : fallback;
}

export function AddMemoryDialog({
  open,
  onOpenChange,
  familyId,
  replyTo,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  familyId: string;
  replyTo: { id: string; title: string } | null;
}) {
  const t = useTranslations();
  const { announce } = useFamily();
  const [kind, setKind] = useState<Kind>('text');
  const [title, setTitle] = useState('');
  const [story, setStory] = useState('');
  const [date, setDate] = useState('');
  const [capsule, setCapsule] = useState(false);
  const [unlockAt, setUnlockAt] = useState('');
  const [file, setFile] = useState<Blob | null>(null);
  const [fileName, setFileName] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Extract<CreateMemoryResult, { ok: true }> | null>(null);

  const recRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function reset() {
    setKind('text');
    setTitle(replyTo ? `Re: ${replyTo.title}`.slice(0, 200) : '');
    setStory('');
    setDate('');
    setCapsule(false);
    setUnlockAt('');
    setFile(null);
    setFileName('');
    setPreviewUrl(null);
    setError(null);
    setResult(null);
    setBusy(false);
  }

  useEffect(() => {
    if (open) reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, replyTo?.id]);

  useEffect(
    () => () => {
      recRef.current?.stream.getTracks().forEach((tr) => tr.stop());
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function pickFile(f: File | undefined) {
    if (!f) return;
    if (f.size > MAX_BYTES) return setError(t('errors.FILE_TOO_LARGE'));
    setError(null);
    setFile(f);
    setFileName(f.name);
    setPreviewUrl(URL.createObjectURL(f));
  }

  async function startRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = ['audio/webm', 'audio/mp4', 'audio/ogg'].find((m) => MediaRecorder.isTypeSupported(m));
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((tr) => tr.stop());
        const base = (rec.mimeType || 'audio/webm').split(';')[0];
        const blob = new Blob(chunks, { type: base });
        setFile(blob);
        setFileName(`voice.${base.split('/')[1] ?? 'webm'}`);
        setPreviewUrl(URL.createObjectURL(blob));
        setRecording(false);
      };
      rec.start();
      recRef.current = rec;
      setRecording(true);
      timerRef.current = setTimeout(() => rec.state === 'recording' && rec.stop(), MAX_RECORD_MS);
    } catch {
      setError(t('voice.permissionDenied'));
    }
  }

  function stopRecording() {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (recRef.current?.state === 'recording') recRef.current.stop();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (capsule && (!unlockAt || new Date(unlockAt).getTime() <= Date.now())) {
      return setError(t('errors.DATE_IN_PAST'));
    }
    if (kind !== 'text' && !file) return setError(t('errors.BAD_REQUEST'));
    if (kind === 'text' && !story.trim() && !title.trim()) return setError(t('errors.BAD_REQUEST'));

    setBusy(true);
    let mediaPath: string | null = null;

    if (kind !== 'text' && file) {
      const supabase = createClient();
      const ext = safeExt(fileName, kind === 'image' ? 'jpg' : 'webm');
      mediaPath = `${familyId}/memories/${crypto.randomUUID()}.${ext}`;
      const contentType = (file.type || (kind === 'image' ? 'image/jpeg' : 'audio/webm')).split(';')[0];
      const { error: upErr } = await supabase.storage
        .from('family-media')
        .upload(mediaPath, file, { contentType, upsert: false });
      if (upErr) {
        setBusy(false);
        return setError(t('errors.GENERIC'));
      }
    }

    const res = await createMemory({
      title: title.trim() || undefined,
      content: story.trim() || undefined,
      mediaPath,
      mediaType: kind,
      memoryDate: date || null,
      unlockDate: capsule && unlockAt ? new Date(unlockAt).toISOString() : null,
      parentId: replyTo?.id ?? null,
    });
    setBusy(false);

    if (!res.ok) {
      if (mediaPath) void createClient().storage.from('family-media').remove([mediaPath]); // don't leave orphans
      return setError(t(`errors.${res.error}`));
    }
    setResult(res);
    if (!(capsule && unlockAt)) announce('memory'); // sealed capsules stay secret
  }

  const tomorrow = new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 16);
  const today = new Date().toISOString().slice(0, 10);

  const kinds: { value: Kind; icon: typeof PenLine; label: string }[] = [
    { value: 'text', icon: PenLine, label: t('memoryTree.leafTypes.text') },
    { value: 'image', icon: ImageIcon, label: t('memoryTree.leafTypes.image') },
    { value: 'audio', icon: Mic, label: t('memoryTree.leafTypes.audio') },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>{t('memoryTree.addLeaf')}</DialogTitle>
        <DialogDescription className="sr-only">{t('memoryTree.subtitle')}</DialogDescription>

        {result ? (
          <div className="space-y-4" role="status">
            <p className="flex items-center gap-2 text-lg font-bold text-success">
              <Sparkles aria-hidden className="size-5" />
              {result.memory.title}
            </p>
            {result.memory.aiUsed ? (
              <>
                {result.memory.emotion && <p className="font-semibold">{result.memory.emotion}</p>}
                {result.memory.summary && <p>{result.memory.summary}</p>}
                {result.memory.followUp && (
                  <div className="rounded-lg bg-kid/10 p-4">
                    <p className="text-sm font-bold text-kid-ink">{t('memoryTree.aiFollowUp')}</p>
                    <p className="mt-1">{result.memory.followUp}</p>
                  </div>
                )}
              </>
            ) : (
              <p className="text-muted-foreground">{t('memoryTree.savedNoAi')}</p>
            )}
            <Button size="lg" onClick={() => onOpenChange(false)}>
              {t('common.close')}
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-5">
            {replyTo && <p className="rounded-md bg-accent px-3 py-2 text-sm font-semibold">{t('memoryTree.replyTo', { title: replyTo.title })}</p>}

            <div role="tablist" className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
              {kinds.map(({ value, icon: Icon, label }) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={kind === value}
                  onClick={() => {
                    setKind(value);
                    setFile(null);
                    setPreviewUrl(null);
                  }}
                  className={cn(
                    'flex min-h-12 items-center justify-center gap-2 rounded-md font-semibold',
                    kind === value ? 'bg-card shadow-sm' : 'text-muted-foreground',
                  )}
                >
                  <Icon aria-hidden className="size-5" />
                  {label}
                </button>
              ))}
            </div>

            <div>
              <Label htmlFor="m-title">
                {t('memoryTree.titleLabel')} <span className="font-normal text-muted-foreground">({t('common.optional')})</span>
              </Label>
              <Input id="m-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
              <p className="mt-1 text-sm text-muted-foreground">{t('memoryTree.titleHint')}</p>
            </div>

            {kind === 'image' && (
              <div className="space-y-2">
                <Label htmlFor="m-photo">{t('memoryTree.uploadPhoto')}</Label>
                <Input id="m-photo" type="file" accept="image/*" onChange={(e) => pickFile(e.target.files?.[0])} className="py-2" />
                {previewUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewUrl} alt="" className="max-h-56 rounded-lg object-cover" />
                )}
              </div>
            )}

            {kind === 'audio' && (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-3">
                  {recording ? (
                    <Button type="button" variant="destructive" size="lg" onClick={stopRecording}>
                      <Square aria-hidden />
                      {t('memoryTree.stopRecording')}
                    </Button>
                  ) : (
                    <Button type="button" variant="secondary" size="lg" onClick={startRecording}>
                      <Mic aria-hidden />
                      {t('memoryTree.recordVoice')}
                    </Button>
                  )}
                  <label className="inline-flex min-h-14 cursor-pointer items-center gap-2 rounded-lg border-2 border-input bg-card px-4 font-semibold hover:bg-accent">
                    <Upload aria-hidden className="size-5" />
                    {t('memoryTree.uploadAudio')}
                    <input type="file" accept="audio/*" className="sr-only" onChange={(e) => pickFile(e.target.files?.[0])} />
                  </label>
                </div>
                {recording && (
                  <p role="status" className="font-semibold text-kid-ink">
                    {t('companion.listening')}
                  </p>
                )}
                {previewUrl && <audio controls src={previewUrl} className="w-full" />}
              </div>
            )}

            <div>
              <Label htmlFor="m-story">{t('memoryTree.storyLabel')}</Label>
              <Textarea id="m-story" value={story} onChange={(e) => setStory(e.target.value)} rows={5} maxLength={10000} />
            </div>

            <div>
              <Label htmlFor="m-date">{t('memoryTree.dateLabel')}</Label>
              <Input id="m-date" type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} className="max-w-56" />
            </div>

            <fieldset className="rounded-lg border-2 border-input p-4">
              <label className="flex cursor-pointer items-center gap-3 font-bold">
                <input type="checkbox" checked={capsule} onChange={(e) => setCapsule(e.target.checked)} className="size-5 accent-primary" />
                {t('memoryTree.timeCapsule')}
              </label>
              <p className="mt-1 text-sm text-muted-foreground">{t('memoryTree.timeCapsuleHint')}</p>
              {capsule && (
                <div className="mt-3">
                  <Label htmlFor="m-unlock">{t('memoryTree.unlockOn')}</Label>
                  <Input id="m-unlock" type="datetime-local" min={tomorrow} value={unlockAt} onChange={(e) => setUnlockAt(e.target.value)} className="max-w-72" required />
                </div>
              )}
            </fieldset>

            {error && (
              <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 font-medium text-destructive">
                {error}{' '}
                {error === t('errors.FREE_MEMORY_LIMIT_REACHED') && (
                  <Link href="/premium" className="underline">
                    {t('credits.upgradeCta')}
                  </Link>
                )}
              </p>
            )}

            <Button type="submit" size="lg" disabled={busy || recording} className="w-full">
              {busy ? t('memoryTree.aiArchiving') : t('memoryTree.publish')}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
