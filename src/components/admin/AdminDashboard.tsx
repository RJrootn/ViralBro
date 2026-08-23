// src/components/admin/AdminDashboard.tsx
//
// Renders whatever GET /api/admin/stats returns — every number here is a
// real query result (see that route), never sample/placeholder data. If a
// number looks wrong, the query is wrong; nothing here is invented to look
// more finished than the product actually is.

'use client'
import { useEffect, useState } from 'react'
import Sidebar from '@/components/dashboard/Sidebar'
import { formatRupees } from '@/lib/billing/plans'

interface Stats {
  users: { total: number; byPlan: Record<string, number> }
  revenue: {
    totalPaise: number
    paymentsCount: number
    byPlan: Record<string, { paise: number; count: number }>
    recent: { amountPaise: number; plan: string; at: string; user: string }[]
  }
  activity: { totalPostsPublished: number; postsLast30d: number; aiCreditsConsumed: number; activeUsersLast7d: number }
  signupsLast30d: { date: string; count: number }[]
}

function Tile({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div style={{ background: '#12121A', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '16px 18px' }}>
      <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: '#5A5A72', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: color ?? '#F2F2F8' }}>{value}</div>
      {sub && <div style={{ fontSize: '0.72rem', color: '#7A7A90', marginTop: 3 }}>{sub}</div>}
    </div>
  )
}

const PLAN_COLORS: Record<string, string> = { FREE: '#5A5A72', CREATOR: '#8B5CF6', PRO: '#FF9933', AGENCY: '#25D366' }

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(res => res.json())
      .then(data => { if (data.success) setStats(data.data); else setError(data.error ?? 'Failed to load') })
      .catch(() => setError('Failed to load'))
  }, [])

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#0A0A0F', fontFamily: 'system-ui, sans-serif', color: '#F0F0F8', WebkitFontSmoothing: 'antialiased' }}>
      <Sidebar />
      <div className="mobile-tighten-padding" style={{ flex: 1, overflowY: 'auto', padding: '2rem 2.5rem' }}>
        <div style={{ maxWidth: 1200 }}>
          <div style={{ marginBottom: 24 }}>
            <div className="page-eyebrow">Owner only</div>
            <div className="page-title">Business <span>Dashboard</span></div>
            <div style={{ fontSize: '0.82rem', color: '#7A7A90', marginTop: 4 }}>Real revenue and usage across every VyralBro account — not a per-creator view.</div>
          </div>

          {error && (
            <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 10, padding: '12px 16px', color: '#F87171', fontSize: '0.85rem', fontWeight: 600 }}>{error}</div>
          )}

          {!stats && !error && (
            <div style={{ color: '#5A5A72', fontSize: '0.85rem', padding: '40px 0', textAlign: 'center' as const }}>Loading…</div>
          )}

          {stats && (
            <>
              <div className="responsive-grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
                <Tile label="Total revenue" value={formatRupees(stats.revenue.totalPaise)} sub={`${stats.revenue.paymentsCount} payments captured`} color="#FF9933" />
                <Tile label="Total users" value={stats.users.total.toLocaleString('en-IN')} sub={`${stats.users.byPlan.FREE ?? 0} on Free`} />
                <Tile label="Active last 7 days" value={stats.activity.activeUsersLast7d.toLocaleString('en-IN')} sub="published ≥1 post" color="#25D366" />
                <Tile label="Posts published (all-time)" value={stats.activity.totalPostsPublished.toLocaleString('en-IN')} sub={`${stats.activity.postsLast30d} in the last 30 days`} />
              </div>

              <div className="responsive-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 24 }}>
                <div style={{ background: '#12121A', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '18px 20px' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, marginBottom: 14 }}>Users by plan</div>
                  {(['FREE', 'CREATOR', 'PRO', 'AGENCY'] as const).map(plan => {
                    const count = stats.users.byPlan[plan] ?? 0
                    const pct = stats.users.total > 0 ? Math.round((count / stats.users.total) * 100) : 0
                    return (
                      <div key={plan} style={{ marginBottom: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', marginBottom: 4 }}>
                          <span style={{ color: PLAN_COLORS[plan], fontWeight: 700 }}>{plan}</span>
                          <span style={{ color: '#7A7A90' }}>{count} · {pct}%</span>
                        </div>
                        <div style={{ height: 6, borderRadius: 3, background: '#1E1E28', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: PLAN_COLORS[plan], borderRadius: 3 }} />
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div style={{ background: '#12121A', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '18px 20px' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, marginBottom: 14 }}>Revenue by plan</div>
                  {(['CREATOR', 'PRO', 'AGENCY'] as const).map(plan => {
                    const r = stats.revenue.byPlan[plan]
                    return (
                      <div key={plan} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: PLAN_COLORS[plan] }}>{plan}</span>
                        <span style={{ fontSize: '0.8rem', color: '#F2F2F8' }}>{formatRupees(r?.paise ?? 0)}</span>
                        <span style={{ fontSize: '0.72rem', color: '#7A7A90' }}>{r?.count ?? 0} payments</span>
                      </div>
                    )
                  })}
                  {stats.revenue.paymentsCount === 0 && (
                    <div style={{ fontSize: '0.78rem', color: '#5A5A72', paddingTop: 6 }}>No payments captured yet.</div>
                  )}
                </div>
              </div>

              <div style={{ background: '#12121A', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '18px 20px', marginBottom: 24 }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, marginBottom: 14 }}>Signups — last 30 days</div>
                <SignupChart series={stats.signupsLast30d} />
              </div>

              <div style={{ background: '#12121A', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '18px 20px' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, marginBottom: 14 }}>Recent payments</div>
                {stats.revenue.recent.length === 0 && <div style={{ fontSize: '0.78rem', color: '#5A5A72' }}>None yet.</div>}
                {stats.revenue.recent.map((p, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < stats.revenue.recent.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', fontSize: '0.78rem' }}>
                    <span style={{ color: '#F2F2F8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>{p.user}</span>
                    <span style={{ color: PLAN_COLORS[p.plan], fontWeight: 700 }}>{p.plan}</span>
                    <span style={{ color: '#F2F2F8' }}>{formatRupees(p.amountPaise)}</span>
                    <span style={{ color: '#5A5A72' }}>{new Date(p.at).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>

              <div style={{ fontSize: '0.7rem', color: '#3A3A52', marginTop: 20 }}>
                AI credits consumed (all users, all-time): {stats.activity.aiCreditsConsumed.toLocaleString('en-IN')}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function SignupChart({ series }: { series: { date: string; count: number }[] }) {
  const max = Math.max(1, ...series.map(d => d.count))
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 90 }}>
      {series.map(d => (
        <div key={d.date} title={`${d.date}: ${d.count}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%' }}>
          <div style={{
            height: `${Math.max(3, Math.round((d.count / max) * 100))}%`,
            background: d.count > 0 ? 'linear-gradient(180deg,#FF9933,#FF6B00)' : '#1E1E28',
            borderRadius: 2,
            minHeight: 3,
          }} />
        </div>
      ))}
    </div>
  )
}
