// src/components/billing/UsageMeter.tsx
//
// Small persistent usage indicator in the sidebar — "7/10 posts this
// month" plus AI credits remaining, so a Free/Creator/Pro user sees they're
// approaching a limit before they hit it and get blocked mid-task. Links
// straight to the Billing tab so the nudge is one click from a fix.

'use client'
import { useRouter } from 'next/navigation'
import { useUsage } from '@/lib/hooks/useUsage'
import { PLAN_LABELS } from '@/lib/billing/plans'

function Bar({ used, limit }: { used: number; limit: number }) {
  // -1 means unlimited (Agency's postsPerMonth) — show a full, calm bar
  // rather than a percentage that can't be computed.
  const pct = limit === -1 ? 100 : Math.min(100, Math.round((used / Math.max(limit, 1)) * 100))
  const color = limit === -1 ? '#25D366' : pct >= 90 ? '#F87171' : pct >= 70 ? '#FBBF24' : '#25D366'
  return (
    <div style={{ height: 5, borderRadius: 3, background: '#1E1E28', overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width 0.3s ease' }} />
    </div>
  )
}

export default function UsageMeter() {
  const router = useRouter()
  const { data } = useUsage()

  if (!data) return null

  const { plan, limits, usage } = data
  const postsLabel = limits.postsPerMonth === -1
    ? `${usage.postsThisMonth} posts · unlimited`
    : `${usage.postsThisMonth}/${limits.postsPerMonth} posts this month`
  const nearLimit = limits.postsPerMonth !== -1 && usage.postsThisMonth >= limits.postsPerMonth * 0.7
  const lowCredits = usage.aiCreditBalance <= limits.aiCredits * 0.15

  return (
    <div style={{ padding: '10px 12px', margin: '4px 6px', borderRadius: 10, background: '#0F0F16', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: '#5A5A72' }}>
          {PLAN_LABELS[plan]} plan
        </span>
        {plan !== 'AGENCY' && (
          <span onClick={() => router.push('/settings?tab=billing')}
            style={{ fontSize: '0.65rem', fontWeight: 700, color: '#FF9933', cursor: 'pointer' }}>
            Upgrade →
          </span>
        )}
      </div>

      <div style={{ fontSize: '0.72rem', color: nearLimit ? '#FBBF24' : '#A0A0B8', marginBottom: 4 }}>{postsLabel}</div>
      <Bar used={usage.postsThisMonth} limit={limits.postsPerMonth} />

      <div style={{ fontSize: '0.72rem', color: lowCredits ? '#F87171' : '#A0A0B8', margin: '8px 0 4px' }}>
        {usage.aiCreditBalance} / {limits.aiCredits} AI credits
      </div>
      <Bar used={limits.aiCredits - usage.aiCreditBalance} limit={limits.aiCredits} />
    </div>
  )
}
