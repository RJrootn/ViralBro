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

const AI_CREDITS_PER_PLAN: Record<Plan, number> = {
  FREE:    50,
  CREATOR: 500,
  PRO:     2000,
  AGENCY:  5000,
}

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

  const toAdd = AI_CREDITS_PER_PLAN[plan]
  await db.$transaction(async (tx) => {
    const updatedUser = await tx.user.update({
      where: { id: payment.userId },
      data:  { aiCreditBalance: { increment: toAdd } },
    })
    await tx.aiCredit.create({
      data: { userId: payment.userId, amount: toAdd, reason: 'plan_monthly', balance: updatedUser.aiCreditBalance },
    })
  })

  return 'applied'
}
