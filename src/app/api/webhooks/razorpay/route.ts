// src/app/api/webhooks/razorpay/route.ts
// Razorpay payment webhook — upgrade user plan after successful payment

// This is the backup confirmation path — see src/app/api/payments/verify/route.ts
// for the primary one, called directly from the checkout popup's success
// handler. This webhook only fires at all once a webhook is registered for
// this URL in the Razorpay Dashboard (Settings → Webhooks); the primary
// path doesn't depend on that manual step, but this stays as a safety net
// for a payment that captures after the browser tab already closed.
import { NextResponse } from 'next/server'
import { verifyRazorpaySignature } from '@/lib/payments/verifyWebhookSignature'
import { applyCapturedPayment } from '@/lib/billing/applyPayment'

export async function POST(req: Request) {
  const body      = await req.text()
  const signature = req.headers.get('x-razorpay-signature') ?? ''

  if (!verifyRazorpaySignature(body, signature, process.env.RAZORPAY_WEBHOOK_SECRET ?? '')) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const event = JSON.parse(body)

  if (event.event === 'payment.captured') {
    const { order_id, id: paymentId } = event.payload.payment.entity
    await applyCapturedPayment(order_id, paymentId)
  }

  return NextResponse.json({ received: true })
}
