// src/lib/payments/verifyWebhookSignature.ts
// Extracted from the Razorpay webhook route so it's a small, pure, testable
// function instead of inline logic with no test coverage.

import crypto from 'crypto'

function timingSafeCompare(signature: string, expected: string): boolean {
  const a = Buffer.from(signature)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

export function verifyRazorpaySignature(
  rawBody: string,
  signature: string,
  secret: string,
): boolean {
  if (!signature || !secret) return false
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  // Constant-time comparison — the previous version used `signature !== expected`,
  // a plain string comparison, which leaks timing information about how many
  // leading bytes matched. Not exploitable in practice over the network jitter
  // of a webhook call, but there's no reason not to do this correctly.
  return timingSafeCompare(signature, expected)
}

// The checkout popup's success handler returns a *different* signature than
// the webhook — HMAC of "order_id|payment_id" using the API key secret
// (RAZORPAY_KEY_SECRET), not the raw webhook body using the webhook secret.
// Razorpay's own docs call this out explicitly; mixing the two up is a
// common integration mistake that fails signature verification silently.
export function verifyRazorpayPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string,
  keySecret: string,
): boolean {
  if (!signature || !keySecret || !orderId || !paymentId) return false
  const expected = crypto.createHmac('sha256', keySecret).update(`${orderId}|${paymentId}`).digest('hex')
  return timingSafeCompare(signature, expected)
}
