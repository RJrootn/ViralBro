// src/app/api/webhooks/razorpay/route.ts
// Razorpay payment webhook — upgrade user plan after successful payment

import { NextResponse }      from 'next/server'
import { db }                from '@/lib/db/client'
import { addMonths }         from 'date-fns'
import type { Plan }         from '@prisma/client'
import { verifyRazorpaySignature } from '@/lib/payments/verifyWebhookSignature'

const AI_CREDITS_PER_PLAN: Record<Plan, number> = {
  FREE:    50,
  CREATOR: 500,
  PRO:     2000,
  AGENCY:  5000,
}

export async function POST(req: Request) {
  const body      = await req.text()
  const signature = req.headers.get('x-razorpay-signature') ?? ''

  if (!verifyRazorpaySignature(body, signature, process.env.RAZORPAY_WEBHOOK_SECRET ?? '')) {
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

    // Add monthly AI credits — atomic increment on the cached balance column
    // (see prisma/schema.prisma note on User.aiCreditBalance) plus a ledger
    // row for the audit trail. Previously this read the ledger's aggregate
    // sum and wrote a new row computed from that read, which is a race
    // condition if two webhook deliveries ever overlap for the same user.
    // An interactive transaction lets the ledger row record the real
    // resulting balance instead of a placeholder.
    const toAdd = AI_CREDITS_PER_PLAN[plan]
    await db.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: payment.userId },
        data:  { aiCreditBalance: { increment: toAdd } },
      })
      await tx.aiCredit.create({
        data: {
          userId:  payment.userId,
          amount:  toAdd,
          reason:  'plan_monthly',
          balance: updatedUser.aiCreditBalance,
        },
      })
    })
  }

  return NextResponse.json({ received: true })
}
