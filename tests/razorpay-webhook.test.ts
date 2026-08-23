import { describe, it, expect } from 'vitest'
import crypto from 'crypto'
import { verifyRazorpaySignature, verifyRazorpayPaymentSignature } from '@/lib/payments/verifyWebhookSignature'

const SECRET = 'test-webhook-secret'

function sign(body: string, secret: string) {
  return crypto.createHmac('sha256', secret).update(body).digest('hex')
}

describe('Razorpay webhook signature verification', () => {
  it('accepts a correctly signed payload', () => {
    const body = JSON.stringify({ event: 'payment.captured' })
    const signature = sign(body, SECRET)
    expect(verifyRazorpaySignature(body, signature, SECRET)).toBe(true)
  })

  it('rejects a payload signed with the wrong secret', () => {
    const body = JSON.stringify({ event: 'payment.captured' })
    const signature = sign(body, 'wrong-secret')
    expect(verifyRazorpaySignature(body, signature, SECRET)).toBe(false)
  })

  it('rejects a tampered body with an otherwise-valid-looking signature', () => {
    const originalBody = JSON.stringify({ event: 'payment.captured', amount: 79900 })
    const signature = sign(originalBody, SECRET)
    const tamperedBody = JSON.stringify({ event: 'payment.captured', amount: 999900 })
    expect(verifyRazorpaySignature(tamperedBody, signature, SECRET)).toBe(false)
  })

  it('rejects when the signature header is missing', () => {
    const body = JSON.stringify({ event: 'payment.captured' })
    expect(verifyRazorpaySignature(body, '', SECRET)).toBe(false)
  })

  it('rejects when the webhook secret is unconfigured', () => {
    const body = JSON.stringify({ event: 'payment.captured' })
    const signature = sign(body, SECRET)
    expect(verifyRazorpaySignature(body, signature, '')).toBe(false)
  })
})

// The checkout popup's success handler uses a *different* signature scheme
// than the webhook (order_id|payment_id signed with the API key secret, not
// the raw webhook body signed with the webhook secret) — this is the path
// that broke in production: an order sat at PENDING forever because nothing
// ever confirmed it besides an unregistered webhook. These tests pin down
// the correct formula so it can't silently drift back to the wrong one.
describe('Razorpay client-checkout payment signature verification', () => {
  const KEY_SECRET = 'test-key-secret'
  function signPayment(orderId: string, paymentId: string, secret: string) {
    return crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex')
  }

  it('accepts a correctly signed order_id|payment_id pair', () => {
    const signature = signPayment('order_abc123', 'pay_xyz789', KEY_SECRET)
    expect(verifyRazorpayPaymentSignature('order_abc123', 'pay_xyz789', signature, KEY_SECRET)).toBe(true)
  })

  it('rejects a signature signed with the wrong key secret', () => {
    const signature = signPayment('order_abc123', 'pay_xyz789', 'wrong-secret')
    expect(verifyRazorpayPaymentSignature('order_abc123', 'pay_xyz789', signature, KEY_SECRET)).toBe(false)
  })

  it('rejects a signature for a different payment_id than claimed', () => {
    const signature = signPayment('order_abc123', 'pay_original', KEY_SECRET)
    expect(verifyRazorpayPaymentSignature('order_abc123', 'pay_swapped', signature, KEY_SECRET)).toBe(false)
  })

  it('rejects when any field is missing', () => {
    const signature = signPayment('order_abc123', 'pay_xyz789', KEY_SECRET)
    expect(verifyRazorpayPaymentSignature('', 'pay_xyz789', signature, KEY_SECRET)).toBe(false)
    expect(verifyRazorpayPaymentSignature('order_abc123', '', signature, KEY_SECRET)).toBe(false)
    expect(verifyRazorpayPaymentSignature('order_abc123', 'pay_xyz789', '', KEY_SECRET)).toBe(false)
    expect(verifyRazorpayPaymentSignature('order_abc123', 'pay_xyz789', signature, '')).toBe(false)
  })
})
