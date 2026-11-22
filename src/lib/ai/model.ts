import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { openai } from '@ai-sdk/openai';
import type { LanguageModel } from 'ai';

export type ChatModel = {
  model: LanguageModel;
  /** A second model tried when the first one fails (quota, overload, model not found). */
  fallback: LanguageModel | null;
  provider: 'google' | 'openai';
};

export type AiErrorCode = 'AI_NOT_CONFIGURED' | 'AI_KEY_INVALID' | 'AI_QUOTA' | 'AI_STREAM_ERROR';

/** Accepts either variable name, so a key saved as GEMINI_API_KEY works too. */
export function getGoogleKey(): string | undefined {
  return process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || undefined;
}

/**
 * Picks the AI provider from env.
 *  - Google key: GOOGLE_GENERATIVE_AI_API_KEY || GEMINI_API_KEY, model gemini-2.5-flash,
 *    fallback gemini-2.0-flash (override with GEMINI_MODEL / GEMINI_FALLBACK_MODEL).
 *  - AI_PRIMARY_PROVIDER=openai prefers OpenAI when its key exists.
 * Returns null when no provider is configured.
 */
export function getChatModel(): ChatModel | null {
  const googleKey = getGoogleKey();
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const prefersOpenAI = process.env.AI_PRIMARY_PROVIDER === 'openai';

  const useGoogle = prefersOpenAI ? !hasOpenAI && !!googleKey : !!googleKey;
  if (useGoogle && googleKey) {
    const google = createGoogleGenerativeAI({ apiKey: googleKey });
    const primary = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const second = process.env.GEMINI_FALLBACK_MODEL || 'gemini-2.0-flash';
    return {
      provider: 'google',
      model: google(primary),
      fallback: second !== primary ? google(second) : null,
    };
  }
  if (hasOpenAI) {
    return { provider: 'openai', model: openai(process.env.OPENAI_MODEL || 'gpt-4o-mini'), fallback: null };
  }
  return null;
}

/** Turns any provider error into one of our friendly, translated error codes. */
export function aiErrorCode(err: unknown): AiErrorCode {
  const e = err as { statusCode?: number; message?: string; cause?: unknown } | undefined;
  const msg = `${e?.message ?? ''} ${(e?.cause as { message?: string } | undefined)?.message ?? ''}`.toLowerCase();
  const status = e?.statusCode;
  if (status === 401 || status === 403 || /api key|api_key|permission_denied|unauthenticated/.test(msg)) return 'AI_KEY_INVALID';
  if (status === 429 || status === 503 || /quota|resource_exhausted|rate limit|overloaded|too many requests/.test(msg)) return 'AI_QUOTA';
  return 'AI_STREAM_ERROR';
}

/** Runs a non-streaming AI call on the main model, then on the fallback model if the first one fails. */
export async function runWithFallback<T>(chat: ChatModel, run: (model: LanguageModel) => Promise<T>): Promise<T> {
  try {
    return await run(chat.model);
  } catch (first) {
    if (!chat.fallback || aiErrorCode(first) === 'AI_KEY_INVALID') throw first;
    console.error('[ai] primary model failed, trying fallback', first);
    return run(chat.fallback);
  }
}
