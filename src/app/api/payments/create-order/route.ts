// src/app/api/payments/create-order/route.ts
// POST /api/payments/create-order — create Razorpay order for plan upgrade

import Razorpay                  from 'razorpay'
import { z }                     from 'zod'
import { withErrorHandler, ok, err } from '@/lib/api'
import { requireSession }        from '@/lib/auth/session'
import { db }                    from '@/lib/db/client'
import type { Plan }             from '@prisma/client'

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
})

// Plan prices in paise (INR × 100)
const PLAN_PRICES: Record<Plan, number> = {
  FREE:    0,
  CREATOR: 79900,   // ₹799/mo
  PRO:     199900,  // ₹1999/mo
  AGENCY:  499900,  // ₹4999/mo
}

const schema = z.object({
  plan: z.enum(['CREATOR', 'PRO', 'AGENCY']),
})

export const POST = withErrorHandler(async (req) => {
  const session = await requireSession()
  const { plan } = schema.parse(await req.json())

  const amount = PLAN_PRICES[plan as Plan]
  if (!amount) return err('Invalid plan selected', 400)

  const order = await razorpay.orders.create({
    amount,
    currency: 'INR',
    notes: {
      userId: session.user.id,
      plan,
    },
  })

  // Record pending payment
  await db.payment.create({
    data: {
      userId:           session.user.id,
      razorpayOrderId:  order.id,
      amount,
      currency:         'INR',
      plan:             plan as Plan,
      status:           'PENDING',
    },
  })

  return ok({
    orderId:    order.id,
    amount,
    currency:   'INR',
    keyId:      process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
  })
})
