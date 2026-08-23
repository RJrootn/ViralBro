// src/components/billing/BillingPanel.tsx
//
// Settings > Billing tab: current plan + real usage, and a pricing table
// where "Upgrade" actually does something — opens Razorpay Checkout,
// creates the order server-side, and once Razorpay's handler fires, polls
// /api/billing/usage (rather than re-verifying the payment client-side —
// the webhook is the one source of truth for actually crediting a plan) so
// the UI catches up the moment the webhook has processed it, instead of
// telling the user to "check back later" with no way to know when.

'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useUsage } from '@/lib/hooks/useUsage'
import { PLAN_CARDS, type PaidPlan } from '@/lib/billing/plans'
import { startCheckout } from '@/lib/billing/checkout'

const PLAN_ORDER = ['FREE', 'CREATOR', 'PRO', 'AGENCY']

export default function BillingPanel() {
  const { data: session } = useSession()
  const { data, refresh } = useUsage()
  const [payingPlan, setPayingPlan] = useState<PaidPlan | null>(null)
  const [status, setStatus] = useState<{ kind: 'success' | 'error' | 'waiting'; text: string } | null>(null)

  const currentPlan = data?.plan ?? 'FREE'
  const currentIdx = PLAN_ORDER.indexOf(currentPlan)

  async function handleUpgrade(plan: PaidPlan) {
    setPayingPlan(plan)
    setStatus(null)
    const result = await startCheckout(plan, session?.user?.email, session?.user?.name)
    if (!result.ok) {
      setPayingPlan(null)
      if (result.reason === 'dismissed') return // user closed the popup — no error, they just changed their mind
      setStatus({ kind: 'error', text:
        result.reason === 'script_load_failed' ? 'Could not load the payment window. Check your connection and try again.' :
        result.reason === 'verify_failed' ? "Payment went through but we couldn't confirm it automatically. Refresh this page in a minute — if your plan still hasn't updated, contact support with your payment confirmation." :
        'Could not start checkout. Please try again in a moment.' })
      return
    }

    // /api/payments/verify (called inside startCheckout's handler) already
    // applied the upgrade synchronously before resolving here — this is
    // just re-fetching to reflect it in the UI, with a short retry margin
    // in case of any read-after-write lag.
    setStatus({ kind: 'waiting', text: 'Activating your plan…' })
    let upgraded = false
    for (let attempt = 0; attempt < 3 && !upgraded; attempt++) {
      const fresh = await refresh()
      upgraded = fresh?.plan === plan
      if (!upgraded) await new Promise(r => setTimeout(r, 1000))
    }
    setPayingPlan(null)
    if (!upgraded) {
      setStatus({ kind: 'error', text: "Payment went through, but activation is taking longer than usual — refresh this page in a minute. If your plan still hasn't updated, contact support with your payment confirmation." })
    }
  }

  // Once `data.plan` catches up to what we just paid for, show success.
  useEffect(() => {
    if (status?.kind === 'waiting' && payingPlan && data?.plan === payingPlan) {
      setStatus({ kind: 'success', text: `You're now on the ${payingPlan} plan.` })
      setPayingPlan(null)
    }
  }, [data?.plan, payingPlan, status?.kind])

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#5A5A72', marginBottom: 6 }}>Current plan</div>
        <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{currentPlan}</div>
        {data && (
          <div style={{ fontSize: '0.8rem', color: '#7A7A90', marginTop: 4 }}>
            {/* Both figures read "used / limit" consistently — see UsageMeter.tsx
                for why that matters (posts and credits used to use opposite
                conventions and looked identical, which read as a bug to RJ). */}
            {data.usage.postsThisMonth}{data.limits.postsPerMonth !== -1 ? `/${data.limits.postsPerMonth}` : ''} posts used this month ·{' '}
            {data.limits.aiCredits - data.usage.aiCreditBalance}/{data.limits.aiCredits} AI credits used
            {data.planExpiresAt && ` · renews ${new Date(data.planExpiresAt).toLocaleDateString()}`}
          </div>
        )}
      </div>

      {status && (
        <div style={{
          marginBottom: 20, padding: '12px 16px', borderRadius: 10, fontSize: '0.82rem', fontWeight: 600,
          background: status.kind === 'success' ? 'rgba(37,211,102,0.1)' : status.kind === 'error' ? 'rgba(248,113,113,0.1)' : 'rgba(255,153,51,0.1)',
          border: `1px solid ${status.kind === 'success' ? 'rgba(37,211,102,0.3)' : status.kind === 'error' ? 'rgba(248,113,113,0.3)' : 'rgba(255,153,51,0.3)'}`,
          color: status.kind === 'success' ? '#25D366' : status.kind === 'error' ? '#F87171' : '#FF9933',
        }}>
          {status.text}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
        {PLAN_CARDS.map(card => {
          const idx = PLAN_ORDER.indexOf(card.key)
          const isCurrent = card.key === currentPlan
          const isDowngrade = idx < currentIdx
          return (
            <div key={card.key} style={{
              padding: '20px 18px', borderRadius: 16, background: '#12121A',
              border: isCurrent ? '1.5px solid #FF9933' : '1px solid rgba(255,255,255,0.08)',
            }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: isCurrent ? '#FF9933' : '#7A7A90', marginBottom: 8 }}>
                {card.label} {isCurrent && '· Current'}
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, marginBottom: 2 }}>
                {card.priceLabel}<span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#7A7A90' }}> {card.period}</span>
              </div>
              <div style={{ fontSize: '0.76rem', color: '#A0A0B8', lineHeight: 1.9, margin: '12px 0 16px' }}>
                {card.limits.postsPerMonth === -1 ? 'Unlimited posts/mo' : `${card.limits.postsPerMonth} posts/mo`}<br />
                {card.limits.aiCredits} AI credits<br />
                {card.limits.platforms} platforms<br />
                {card.limits.teamMembers} team member{card.limits.teamMembers > 1 ? 's' : ''}<br />
                {/* Transparency on the one thing that isn't a quota number —
                    Free/Creator posts carry a small VyralBro credit; Pro and
                    above publish clean. Stated here plainly rather than left
                    for someone to discover on their own live post. */}
                {card.key === 'FREE' || card.key === 'CREATOR'
                  ? <span style={{ color: '#7A7A90' }}>Includes &ldquo;Made with VyralBro&rdquo; credit</span>
                  : <span style={{ color: '#25D366' }}>✓ No VyralBro branding</span>}
              </div>
              {card.key === 'FREE' ? (
                <div style={{ fontSize: '0.76rem', color: '#5A5A72', textAlign: 'center' as const, padding: '9px 0' }}>
                  {isCurrent ? 'Your current plan' : 'Free tier'}
                </div>
              ) : (
                <button
                  disabled={isCurrent || isDowngrade || payingPlan !== null}
                  onClick={() => handleUpgrade(card.key as PaidPlan)}
                  style={{
                    width: '100%', padding: '10px 0', borderRadius: 10, border: 'none', fontSize: '0.82rem', fontWeight: 700, fontFamily: 'inherit',
                    cursor: isCurrent || isDowngrade || payingPlan !== null ? 'not-allowed' : 'pointer',
                    background: isCurrent || isDowngrade ? '#1E1E28' : 'linear-gradient(135deg,#FF9933,#FF6B00)',
                    color: isCurrent || isDowngrade ? '#5A5A72' : '#fff',
                    opacity: payingPlan && payingPlan !== card.key ? 0.5 : 1,
                  }}>
                  {isCurrent ? 'Current plan' : isDowngrade ? 'Included below' : payingPlan === card.key ? 'Processing…' : `Upgrade to ${card.label}`}
                </button>
              )}
            </div>
          )
        })}
      </div>

      <div style={{ fontSize: '0.72rem', color: '#5A5A72', marginTop: 20, lineHeight: 1.6 }}>
        Prices are in ₹, billed monthly via Razorpay. No credit card is stored by VyralBro — Razorpay handles payment details directly. Cancel or change your plan any time; a downgrade takes effect at the end of the current billing cycle.
      </div>
    </div>
  )
}
