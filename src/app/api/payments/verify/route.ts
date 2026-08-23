// src/app/api/payments/verify/route.ts
//
// The primary payment-confirmation path — called directly from the
// checkout popup's success handler the moment Razorpay reports the payment
// succeeded, so upgrading someone's plan doesn't depend on a webhook being
// registered in the Razorpay Dashboard (a separate manual step the
// application code can't do for itself). The webhook stays wired up as a
// backup for the rare case a browser tab closes before this call fires.

import { z } from 'zod'
import { withErrorHandler, ok, err } from '@/lib/api'
import { requireSession } from '@/lib/auth/session'
import { db } from '@/lib/db/client'
import { verifyRazorpayPaymentSignature } from '@/lib/payments/verifyWebhookSignature'
import { applyCapturedPayment } from '@/lib/billing/applyPayment'

const schema = z.object({
  razorpay_order_id: z.string(),
  razorpay_payment_id: z.string(),
  razorpay_signature: z.string(),
})

export const POST = withErrorHandler(async (req) => {
  const session = await requireSession()
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = schema.parse(await req.json())

  const valid = verifyRazorpayPaymentSignature(
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    process.env.RAZORPAY_KEY_SECRET ?? '',
  )
  if (!valid) return err('Payment signature could not be verified', 400)

  // Only the user who created this order can confirm it — otherwise anyone
  // who intercepted an order_id could try to claim someone else's payment.
  const payment = await db.payment.findUnique({ where: { razorpayOrderId: razorpay_order_id } })
  if (!payment || payment.userId !== session.user.id) {
    return err('Order not found', 404)
  }

  const result = await applyCapturedPayment(razorpay_order_id, razorpay_payment_id)
  if (result === 'unknown_order') return err('Order not found', 404)

  return ok({ plan: payment.plan, alreadyApplied: result === 'already_applied' })
})
