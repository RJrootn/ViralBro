import { z } from 'zod'
import { withErrorHandler, ok, err } from '@/lib/api'
import { requireSession } from '@/lib/auth/session'
import { db } from '@/lib/db/client'
import type { Plan } from '@prisma/client'
import { PLAN_PRICES } from '@/lib/billing/plans'

const schema = z.object({
  plan: z.enum(['CREATOR', 'PRO', 'AGENCY']),
})

export const POST = withErrorHandler(async (req) => {
  const session = await requireSession()
  const { plan } = schema.parse(await req.json())
  const amount = PLAN_PRICES[plan]
  if (!amount) return err('Invalid plan', 400)

  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    return err('Payments not configured yet', 503)
  }

  const Razorpay = (await import('razorpay')).default
  const razorpay = new Razorpay({
    key_id:     process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
  })

  const order = await razorpay.orders.create({ amount, currency: 'INR' })

  await db.payment.create({
    data: {
      userId:          session.user.id,
      razorpayOrderId: order.id,
      amount,
      currency:        'INR',
      plan:            plan as Plan,
      status:          'PENDING',
    },
  })

  return ok({ orderId: order.id, amount, currency: 'INR' })
})
