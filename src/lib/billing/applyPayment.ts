// src/lib/billing/applyPayment.ts
//
// The actual "mark this payment captured, upgrade the plan, credit AI
// credits" logic — extracted so both the webhook and the client-confirmed
// verify route (src/app/api/payments/verify/route.ts) run the exact same
// code instead of two copies that can drift. Idempotent: calling it twice
// for the same already-CAPTURED payment is a no-op, since both the webhook
// and the client verify call can legitimately race to be first for the same
// payment (webhook delivery isn't instant, and the client calls verify the
// moment the checkout popup's handler fires).

import { addMonths } from 'date-fns'
import type { Plan } from '@prisma/client'
import { db } from '@/lib/db/client'
import { PLAN_LIMITS } from '@/lib/api'

// Was a second hardcoded copy of credit allowances here, separate from
// PLAN_LIMITS in api.ts — it drifted out of sync during the 2026-08-23
// pricing revision (this still said CREATOR: 500 after CREATOR moved to
// 400 credits), which would have silently over-credited every real Creator
// upgrade. Reading from PLAN_LIMITS directly means there's only one place
// left to update when limits change.

export async function applyCapturedPayment(orderId: string, paymentId: string): Promise<'applied' | 'already_applied' | 'unknown_order'> {
  const payment = await db.payment.findUnique({ where: { razorpayOrderId: orderId } })
  if (!payment) return 'unknown_order'

  // Claim the row atomically: only one of {webhook, client-verify} — whichever
  // gets here first — flips status away from PENDING and proceeds to credit.
  // A plain read-then-write (check status, then update) would let both race
  // past the check before either writes, double-crediting AI credits.
  const claimed = await db.payment.updateMany({
    where: { razorpayOrderId: orderId, status: { not: 'CAPTURED' } },
    data: { razorpayPaymentId: paymentId, status: 'CAPTURED' },
  })
  if (claimed.count === 0) return 'already_applied'

  const plan = payment.plan
  await db.user.update({
    where: { id: payment.userId },
    data: { plan, planExpiresAt: addMonths(new Date(), 1) },
  })

  // Reset (not increment) to the new plan's cap and restart the credit
  // cycle from now — matches "unused credits do not roll over between
  // billing cycles" (Terms of Service, and the pricing page). Incrementing
  // on every renewal let a balance grow indefinitely across cycles, which
  // is exactly what left RJ's account sitting on a balance permanently
  // above any plan's cap and made the "credits used" display look broken.
  const cap = PLAN_LIMITS[plan].aiCredits
  const nextReset = addMonths(new Date(), 1)
  await db.$transaction(async (tx) => {
    const before = await tx.user.findUnique({
      where: { id: payment.userId },
      select: { aiCreditBalance: true },
    })
    const updatedUser = await tx.user.update({
      where: { id: payment.userId },
      data:  { aiCreditBalance: cap, creditsResetAt: nextReset },
    })
    await tx.aiCredit.create({
      data: {
        userId:  payment.userId,
        amount:  cap - (before?.aiCreditBalance ?? 0),
        reason:  'plan_monthly',
        balance: updatedUser.aiCreditBalance,
      },
    })
  })

  return 'applied'
}
