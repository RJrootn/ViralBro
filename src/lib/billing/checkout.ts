// src/lib/billing/checkout.ts
//
// Client-side Razorpay Checkout — loads the Checkout.js script on demand
// (never bundled/imported at build time, since it just injects a global
// `Razorpay` constructor), creates a server-side order, opens the payment
// popup, and resolves once Razorpay's own handler fires. Actually crediting
// the plan/AI-credits happens server-side in the webhook (source of truth,
// works even if the browser tab closes mid-payment) — this just gets the
// user through the popup and hands back control so the caller can poll
// /api/billing/usage until the webhook has done its job.

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void }
  }
}

interface RazorpaySuccessResponse {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise(resolve => {
    if (window.Razorpay) return resolve(true)
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

export interface CheckoutResult {
  ok: boolean
  reason?: 'script_load_failed' | 'order_failed' | 'dismissed' | 'verify_failed'
}

export async function startCheckout(plan: 'CREATOR' | 'PRO' | 'AGENCY', userEmail?: string | null, userName?: string | null): Promise<CheckoutResult> {
  const loaded = await loadRazorpayScript()
  if (!loaded || !window.Razorpay) return { ok: false, reason: 'script_load_failed' }

  const orderRes = await fetch('/api/payments/create-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan }),
  })
  const orderData = await orderRes.json()
  if (!orderData.success) return { ok: false, reason: 'order_failed' }

  const { orderId, amount, currency } = orderData.data

  return new Promise(resolve => {
    const rzp = new window.Razorpay!({
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      amount,
      currency,
      name: 'VyralBro',
      description: `Upgrade to ${plan}`,
      order_id: orderId,
      prefill: { email: userEmail ?? undefined, name: userName ?? undefined },
      theme: { color: '#FF9933' },
      // This fires the moment Razorpay confirms the payment — call our own
      // verify endpoint immediately with the signed response rather than
      // trusting the popup closing to mean success, and rather than relying
      // on a webhook that needs separate registration in the Razorpay
      // Dashboard to ever reach us at all.
      handler: async (response: RazorpaySuccessResponse) => {
        try {
          const verifyRes = await fetch('/api/payments/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(response),
          })
          const verifyData = await verifyRes.json()
          resolve(verifyData.success ? { ok: true } : { ok: false, reason: 'verify_failed' })
        } catch {
          resolve({ ok: false, reason: 'verify_failed' })
        }
      },
      modal: { ondismiss: () => resolve({ ok: false, reason: 'dismissed' }) },
    })
    rzp.open()
  })
}
