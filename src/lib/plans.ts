export const PLAN_IDS = ['monthly', 'yearly'] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export interface Plan {
  id: PlanId;
  amountVnd: number;
  durationDays: number;
  seatsIncluded: number;
  badge?: string;
}

export const PLANS: Record<PlanId, Plan> = {
  monthly: {
    id: 'monthly',
    amountVnd: 79_000,
    durationDays: 30,
    seatsIncluded: 6,
  },
  yearly: {
    id: 'yearly',
    amountVnd: 799_000,
    durationDays: 365,
    seatsIncluded: 6,
    badge: 'Tiết kiệm 16%',
  },
};
