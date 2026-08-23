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

// Amount in paise (₹1,999 = 199900), matching Razorpay's smallest-unit convention.
//
// Finalized 2026-08-23 after a unit-economics review (see project doc
// "vyralbro-pricing-unit-economics-2026-08-23"). All three paid tiers hold
// strong margin even in the worst-case (near-token-cap) generation cost
// scenario — 88.0%/78.4%/63.4% worst-case, 89.7%/81.6%/69.1% typical, for
// Creator/Pro/Top1% Club respectively — declining smoothly as plans go up,
// the normal SaaS volume-discount pattern, rather than dipping and
// recovering unevenly (an earlier ₹799/₹1,999/₹4,999 version had margin
// erode on upgrade; a later ₹2,999 Creator draft had margin dip at the top
// tier instead). Revenue per credit: ₹5.00 (Creator) -> ₹2.50 (Pro) ->
// ₹1.40 (Top1% Club) — each tier a deliberate, moderate step down.
export const PLAN_PRICES: Record<PaidPlan, number> = {
  CREATOR: 199900,
  PRO:     499900,
  AGENCY:  699900,
}

// AGENCY's display label is "Top1% Club" — matches VyralBro's own "top 1%
// SaaS" positioning. The underlying plan key stays AGENCY (matches the
// Prisma enum; renaming that would need a migration for zero product
// benefit) — only the customer-facing label changed.
export const PLAN_LABELS: Record<'FREE' | PaidPlan, string> = {
  FREE:    'Free',
  CREATOR: 'Creator',
  PRO:     'Pro',
  AGENCY:  'Top1% Club',
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
