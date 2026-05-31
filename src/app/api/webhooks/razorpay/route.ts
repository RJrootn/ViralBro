// src/app/api/webhooks/razorpay/route.ts
// Razorpay payment webhook — upgrade user plan after successful payment

import crypto                from 'crypto'
import { NextResponse }      from 'next/server'
import { db }                from '@/lib/db/client'
import { addMonths }         from 'date-fns'
import type { Plan }         from '@prisma/client'

const AI_CREDITS_PER_PLAN: Record<Plan, number> = {
  FREE:    50,
  CREATOR: 500,
  PRO:     2000,
  AGENCY:  5000,
}

export async function POST(req: Request) {
  const body      = await req.text()
  const signature = req.headers.get('x-razorpay-signature') ?? ''

  // Verify webhook signature
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
    .update(body)
    .digest('hex')

  if (signature !== expected) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const event = JSON.parse(body)

  if (event.event === 'payment.captured') {
    const { order_id, id: paymentId } = event.payload.payment.entity

    const payment = await db.payment.findUnique({
      where: { razorpayOrderId: order_id },
    })
    if (!payment) return NextResponse.json({ ok: true }) // unknown order

    // Update payment record
    await db.payment.update({
      where: { razorpayOrderId: order_id },
      data: {
        razorpayPaymentId: paymentId,
        status: 'CAPTURED',
      },
    })

    // Upgrade user plan
    const plan = payment.plan
    await db.user.update({
      where: { id: payment.userId },
      data: {
        plan,
        planExpiresAt: addMonths(new Date(), 1),
      },
    })

    // Add monthly AI credits
    const existingBalance = await db.aiCredit.aggregate({
      where: { userId: payment.userId },
      _sum:  { amount: true },
    })
    const balance   = existingBalance._sum.amount ?? 0
    const toAdd     = AI_CREDITS_PER_PLAN[plan]

    await db.aiCredit.create({
      data: {
        userId:  payment.userId,
        amount:  toAdd,
        reason:  'plan_monthly',
        balance: balance + toAdd,
      },
    })
  }

  return NextResponse.json({ received: true })
}
