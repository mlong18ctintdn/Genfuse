'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Lang } from '@/lib/ai/prompts';

const BCP47: Record<Lang, string> = { vi: 'vi-VN', en: 'en-US', zh: 'zh-CN', es: 'es-ES' };

interface RecognitionResult {
  isFinal: boolean;
  0: { transcript: string };
}
interface RecognitionEvent {
  results: ArrayLike<RecognitionResult>;
}
interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type RecognitionCtor = new () => Recognition;

function getRecognitionCtor(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** Browsers stop long utterances after ~15 s, so read in sentence-sized pieces. */
function chunkText(text: string, max = 180): string[] {
  const sentences = text.match(/[^.!?。！？\n]+[.!?。！？]*\s*/g) ?? [text];
  const chunks: string[] = [];
  let cur = '';
  for (const s of sentences) {
    if ((cur + s).length > max && cur) {
      chunks.push(cur.trim());
      cur = '';
    }
    cur += s;
  }
  if (cur.trim()) chunks.push(cur.trim());
  return chunks;
}

export type SpeechError = 'unsupported' | 'permission' | null;

/**
 * Voice input (SpeechRecognition) and read-aloud (speechSynthesis) for
 * vi-VN, en-US, zh-CN and es-ES. Safe to render on the server.
 */
export function useSpeech(lang: Lang) {
  const [canListen, setCanListen] = useState(false);
  const [canSpeak, setCanSpeak] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState<SpeechError>(null);
  const recRef = useRef<Recognition | null>(null);

  useEffect(() => {
    setCanListen(!!getRecognitionCtor());
    setCanSpeak(typeof window !== 'undefined' && 'speechSynthesis' in window);
    return () => {
      recRef.current?.abort();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, []);

  const startListening = useCallback(
    (onText: (text: string, isFinal: boolean) => void) => {
      const Ctor = getRecognitionCtor();
      if (!Ctor) {
        setError('unsupported');
        return;
      }
      recRef.current?.abort();
      const rec = new Ctor();
      rec.lang = BCP47[lang];
      rec.continuous = false;
      rec.interimResults = true;
      rec.onresult = (e) => {
        let text = '';
        for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
        onText(text.trim(), e.results[e.results.length - 1]?.isFinal ?? false);
      };
      rec.onerror = (e) => {
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') setError('permission');
        setListening(false);
      };
      rec.onend = () => setListening(false);
      recRef.current = rec;
      setError(null);
      setListening(true);
      try {
        rec.start();
      } catch {
        setListening(false);
      }
    },
    [lang],
  );

  const stopListening = useCallback(() => {
    recRef.current?.stop();
    setListening(false);
  }, []);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        setError('unsupported');
        return;
      }
      const synth = window.speechSynthesis;
      synth.cancel();
      const clean = text.replace(/[*_#`>]/g, '').trim();
      if (!clean) return;

      const tag = BCP47[lang];
      const voice =
        synth.getVoices().find((v) => v.lang === tag) ??
        synth.getVoices().find((v) => v.lang.toLowerCase().startsWith(lang));

      const pieces = chunkText(clean);
      setSpeaking(true);
      pieces.forEach((piece, i) => {
        const u = new SpeechSynthesisUtterance(piece);
        u.lang = tag;
        if (voice) u.voice = voice;
        u.rate = 0.92; // slightly slower: easier to follow
        if (i === pieces.length - 1) {
          u.onend = () => setSpeaking(false);
          u.onerror = () => setSpeaking(false);
        }
        synth.speak(u);
      });
    },
    [lang],
  );

  return { canListen, canSpeak, listening, speaking, error, startListening, stopListening, speak, stopSpeaking };
}
