import { google } from '@ai-sdk/google';
import { openai } from '@ai-sdk/openai';
import type { LanguageModel } from 'ai';

export type ChatModel = {
  model: LanguageModel;
  provider: 'google' | 'openai';
};

/**
 * Picks the AI provider from env.
 *  - AI_PRIMARY_PROVIDER=google|openai chooses the first choice (default: google).
 *  - If the first choice has no API key, the other provider is used automatically.
 * Returns null when no provider is configured.
 */
export function getChatModel(): ChatModel | null {
  const hasGoogle = !!process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const prefersOpenAI = process.env.AI_PRIMARY_PROVIDER === 'openai';

  const useGoogle = prefersOpenAI ? !hasOpenAI && hasGoogle : hasGoogle;
  if (useGoogle) {
    return {
      provider: 'google',
      model: google(process.env.GEMINI_MODEL || 'gemini-2.5-flash'),
    };
  }
  if (hasOpenAI) {
    return {
      provider: 'openai',
      model: openai(process.env.OPENAI_MODEL || 'gpt-4o-mini'),
    };
  }
  return null;
}
