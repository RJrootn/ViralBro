// src/lib/billing/plans.ts
//
// Single source of truth for what each paid plan costs and how it's
// labeled, shared between the checkout API route (server) and the
// pricing/billing UI (client) so the price shown to a user is always the
// exact price Razorpay will charge them — previously PLAN_PRICES only
// existed inside the create-order route, with no equivalent on the
// frontend, so there was nowhere honest to show "₹799/month" before
// someone actually clicked to pay.

import { PLAN_LIMITS } from '@/lib/api'

export type PaidPlan = 'CREATOR' | 'PRO' | 'AGENCY'

// Amount in paise (₹799 = 79900), matching Razorpay's smallest-unit convention.
export const PLAN_PRICES: Record<PaidPlan, number> = {
  CREATOR: 79900,
  PRO:     199900,
  AGENCY:  499900,
}

export const PLAN_LABELS: Record<'FREE' | PaidPlan, string> = {
  FREE:    'Free',
  CREATOR: 'Creator',
  PRO:     'Pro',
  AGENCY:  'Agency',
}

export function formatRupees(paise: number) {
  return `₹${(paise / 100).toLocaleString('en-IN')}`
}

// Ordered plan cards for the pricing/billing UI — includes FREE (₹0, not
// purchasable) so the comparison table has a real starting point.
export const PLAN_CARDS = (['FREE', 'CREATOR', 'PRO', 'AGENCY'] as const).map(key => ({
  key,
  label: PLAN_LABELS[key],
  priceLabel: key === 'FREE' ? '₹0' : formatRupees(PLAN_PRICES[key as PaidPlan]),
  period: key === 'FREE' ? 'forever' : '/month',
  limits: PLAN_LIMITS[key],
}))
