import { describe, it, expect } from 'vitest'
import crypto from 'crypto'
import { verifyRazorpaySignature } from '@/lib/payments/verifyWebhookSignature'

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
