import 'server-only';
import { PayOS } from '@payos/node';

let client: PayOS | null = null;

/** Returns null when PayOS is not configured, so routes can answer 503 instead of crashing. */
export function getPayOS(): PayOS | null {
  const { PAYOS_CLIENT_ID, PAYOS_API_KEY, PAYOS_CHECKSUM_KEY } = process.env;
  if (!PAYOS_CLIENT_ID || !PAYOS_API_KEY || !PAYOS_CHECKSUM_KEY) return null;
  client ??= new PayOS({ clientId: PAYOS_CLIENT_ID, apiKey: PAYOS_API_KEY, checksumKey: PAYOS_CHECKSUM_KEY });
  return client;
}

/**
 * PayOS needs a unique positive integer per payment (max 2^53-1).
 * 13-digit timestamp + 3 random digits = 16 digits (~1.8e15), safely below the limit.
 */
export function newOrderCode(): number {
  return Number(`${Date.now()}${Math.floor(100 + Math.random() * 900)}`);
}

/** Loose shapes of the PayOS responses we use (kept local so a SDK typing change can't break the build). */
export type CreatedLink = {
  checkoutUrl: string;
  qrCode: string;
  paymentLinkId: string;
  accountNumber?: string;
  accountName?: string;
  bin?: string;
};

export type LinkInfo = { status?: string };
