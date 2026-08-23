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
  reason?: 'script_load_failed' | 'order_failed' | 'dismissed'
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
      handler: () => resolve({ ok: true }),
      modal: { ondismiss: () => resolve({ ok: false, reason: 'dismissed' }) },
    })
    rzp.open()
  })
}
