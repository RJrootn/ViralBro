// src/lib/payments/verifyWebhookSignature.ts
// Extracted from the Razorpay webhook route so it's a small, pure, testable
// function instead of inline logic with no test coverage.

import crypto from 'crypto'

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
  const a = Buffer.from(signature)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}
