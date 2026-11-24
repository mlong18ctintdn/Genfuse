export type PlanId = 'monthly' | 'yearly';
export const PLAN_IDS: PlanId[] = ['monthly', 'yearly'];

export interface Plan {
  id: PlanId;
  amount: number;
  label: string;
  itemName: string;
  durationDays: number;
  seatsIncluded: number;
  badge?: string;
}

export const PLANS: Record<PlanId, Plan> = {
  monthly: {
    id: 'monthly',
    amount: 79_000,
    label: 'GENFUSE Pro 1 Thang',
    itemName: 'GENFUSE Gia Dinh Pro 1 Thang (6 thanh vien)',
    durationDays: 30,
    seatsIncluded: 6,
  },
  yearly: {
    id: 'yearly',
    amount: 799_000,
    label: 'GENFUSE Pro 1 Nam',
    itemName: 'GENFUSE Gia Dinh Pro 1 Nam (6 thanh vien)',
    durationDays: 365,
    seatsIncluded: 6,
    badge: 'Tiết kiệm 150.000đ',
  },
};
