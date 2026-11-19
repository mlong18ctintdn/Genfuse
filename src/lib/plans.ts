/**
 * Server-side price list. The browser only ever sends a plan id; the amount
 * charged and the length of Premium come from here, so they cannot be tampered with.
 * Keep in sync with the prices shown in messages/*.json (premium.monthly / premium.yearly).
 */
export const PLANS = {
  monthly: { amount: 39_000, label: 'GENFUSE THANG', itemName: 'GENFUSE Premium (1 month)' },
  yearly: { amount: 390_000, label: 'GENFUSE NAM', itemName: 'GENFUSE Premium (1 year)' },
} as const;

export type PlanId = keyof typeof PLANS;
export const PLAN_IDS = Object.keys(PLANS) as PlanId[];
