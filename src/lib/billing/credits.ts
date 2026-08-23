// src/lib/billing/credits.ts
//
// Lazy, reset-on-read AI credit cycle. There's no cron/scheduler anywhere
// in this app (the only queues are BullMQ job queues for publishing posts
// and fetching analytics — nothing repeatable/time-based), so instead of a
// nightly job resetting every user's balance, each user's own next read
// (a generate call, or the billing/usage fetch that powers the sidebar
// meter) checks whether their cycle has rolled over and true-ups right
// then, before anything else reads or spends the balance.
//
// This also makes "unused credits do not currently roll over between
// billing cycles" (our own Terms of Service, and what the pricing page
// promises) actually true. Before this, nothing ever reset a user's
// balance — applyPayment.ts only ever incremented it, and FREE users never
// went through applyPayment at all — so a balance could sit permanently
// above the current plan's cap (e.g. the one-time 50-credit signup bonus,
// still above today's 25-credit FREE cap) and the "X/25 credits used"
// display would look stuck at 0 forever, even while real usage was
// happening underneath it (2026-08-23 bug report from RJ).

import { addMonths } from 'date-fns'
import type { Plan } from '@prisma/client'
import { db } from '@/lib/db/client'
import { PLAN_LIMITS } from '@/lib/api'

/**
 * Returns the user's current AI credit balance, resetting it to their
 * plan's full allotment first if their cycle has rolled over (or never
 * started — a NULL creditsResetAt, which is every pre-existing row, is
 * treated as due now).
 */
export async function ensureFreshCredits(userId: string, plan: Plan): Promise<number> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { aiCreditBalance: true, creditsResetAt: true },
  })
  if (!user) return 0

  const now = new Date()
  if (user.creditsResetAt && user.creditsResetAt > now) {
    return user.aiCreditBalance
  }

  const cap = PLAN_LIMITS[plan]?.aiCredits ?? PLAN_LIMITS.FREE.aiCredits
  const nextReset = addMonths(now, 1)

  await db.$transaction([
    db.user.update({
      where: { id: userId },
      data: { aiCreditBalance: cap, creditsResetAt: nextReset },
    }),
    db.aiCredit.create({
      data: { userId, amount: cap - user.aiCreditBalance, reason: 'monthly_reset', balance: cap },
    }),
  ])

  return cap
}
