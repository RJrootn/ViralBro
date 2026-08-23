'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PLATFORM_COLORS } from '@/lib/constants/platforms'

const PC = PLATFORM_COLORS

function fmt(d: Date) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function last30Days() {
  const end = new Date()
  const start = new Date(end)
  start.setDate(start.getDate() - 30)
  return { start, end }
}

function compact(n: number) {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n)
}

interface AnalyticsResponse {
  totals: { reach?: number; likes?: number; comments?: number; shares?: number; saves?: number; clicks?: number }
  avgEngagementRate: number
  daily: Array<unknown>
  postCount: number
}

// Fake fallback shown only until real Analytics rows exist for the selected
// range (see fetchInstagramInsights in src/lib/social/analytics.ts, which
// now actually populates that table 20 min + 24h after each Instagram
// publish). "Posts Published" is never part of this fallback — it comes
// straight from a real Post count either way, so there's no reason to fake
// the one number that was always real for free.
const SAMPLE_CARDS = [
  { label: 'Total Reach',     val: '3.09M', delta: '↑ 18.4% vs last month', up: true,  icon: '📡', color: '#FF9933' },
  { label: 'Avg. Engagement', val: '6.7%',  delta: '↑ 2.1pp all platforms', up: true,  icon: '💬', color: '#8B5CF6' },
  { label: 'Total Saves',     val: '41.2K', delta: '↓ 3.2% — needs fix',   up: false, icon: '🔖', color: '#FBBF24' },
  { label: 'Engagements',     val: '2.18L', delta: '↑ 41% — best ever!',   up: true,  icon: '👁', color: '#60A5FA' },
]

export default function DashboardPage() {
  const router = useRouter()
  const [range, setRange] = useState(last30Days)
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null)

  useEffect(() => {
    const days = Math.max(1, Math.min(90, Math.round((range.end.getTime() - range.start.getTime()) / 86_400_000)))
    fetch(`/api/analytics?days=${days}`)
      .then(res => res.json())
      .then(data => { if (data.success) setAnalytics(data.data) })
      .catch(() => {})
  }, [range])

  // True only once at least one real Analytics row exists for this range —
  // i.e. the ingestion pipeline has actually fetched something, not just
  // that the endpoint responded.
  const hasRealAnalytics = !!analytics && analytics.daily.length > 0

  const postsPublishedCard = {
    label: 'Posts Published',
    val: String(analytics?.postCount ?? 0),
    delta: null as string | null,
    up: null as boolean | null,
    icon: '📝',
    color: '#25D399',
  }

  const realCards = analytics ? [
    { label: 'Total Reach',     val: compact(analytics.totals.reach ?? 0),     delta: null, up: null, icon: '📡', color: '#FF9933' },
    { label: 'Avg. Engagement', val: `${((analytics.avgEngagementRate ?? 0) * 100).toFixed(1)}%`, delta: null, up: null, icon: '💬', color: '#8B5CF6' },
    { label: 'Total Saves',     val: compact(analytics.totals.saves ?? 0),     delta: null, up: null, icon: '🔖', color: '#FBBF24' },
    {
      label: 'Engagements', delta: null, up: null, icon: '👁', color: '#60A5FA',
      val: compact((analytics.totals.likes ?? 0) + (analytics.totals.comments ?? 0) + (analytics.totals.shares ?? 0) + (analytics.totals.saves ?? 0)),
    },
  ] : []

  const cards = hasRealAnalytics
    ? [realCards[0], realCards[1], postsPublishedCard, realCards[2], realCards[3]]
    : [SAMPLE_CARDS[0], SAMPLE_CARDS[1], postsPublishedCard, SAMPLE_CARDS[2], SAMPLE_CARDS[3]]

  return (
    <>
        <div className="mobile-header-pad" style={{ height: 54, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,#FF9933 33.33%,#fff 33.33% 66.66%,#138808 66.66%)' }} />
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '-0.01em' }}>Dashboard</div>
            <div style={{ fontSize: '0.72rem', color: '#5A5A72' }}>{fmt(range.start)} – {fmt(range.end)} · All channels combined</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <DateRangeButton range={range} onChange={setRange} />
            <WorkspaceButton />
            <button onClick={() => router.push('/studio')}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg,#FF9933,#FF6B00)', fontSize: '0.78rem', fontWeight: 700, color: '#fff', cursor: 'pointer', boxShadow: '0 2px 12px rgba(255,153,51,0.3)', fontFamily: 'inherit' }}>
              + Post Content
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px 24px' }}>
          {/* "Posts Published" (the 3rd card) is always real — it's a plain
              count of your published posts, no analytics pipeline required.
              The other 4 cards are real once fetchInstagramInsights (see
              src/lib/social/analytics.ts) has written at least one row for
              this range — currently Instagram only, 20 min + 24h after each
              publish. Until then they show clearly-labeled sample numbers
              instead of pretending there's data that hasn't arrived yet. */}
          {!hasRealAnalytics && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,153,51,0.08)', border: '1px solid rgba(255,153,51,0.25)', borderRadius: 10, padding: '8px 14px', marginBottom: 16, fontSize: '0.75rem', color: '#FF9933', fontWeight: 600 }}>
              ✦ Sample data (except Posts Published, which is real) — publish to Instagram and check back in ~20 min to see real reach/engagement here
            </div>
          )}
          <div className="responsive-grid-5" style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginBottom: 20 }}>
            {cards.map(m => (
              <div key={m.label} style={{ background: '#12121A', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '14px 16px', position: 'relative', overflow: 'hidden', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.12)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: m.color }} />
                <div style={{ fontSize: '0.9rem', marginBottom: 8 }}>{m.icon}</div>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase' as const, color: '#7A7A90', marginBottom: 4 }}>{m.label}</div>
                <div style={{ fontSize: '1.7rem', fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1, color: '#F0F0F8', marginBottom: 6 }}>{m.val}</div>
                <div style={{ fontSize: '0.7rem', fontWeight: 600, color: m.delta == null ? '#5A5A72' : m.up ? '#34D399' : '#F87171' }}>
                  {m.delta ?? (hasRealAnalytics || m.label === 'Posts Published' ? 'Live' : '')}
                </div>
              </div>
            ))}
          </div>

          <div className="responsive-split-primary" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16, marginBottom: 16 }}>
            <div style={{ background: '#12121A', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700 }}>Reach Trend — All Platforms</div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#FF9933', cursor: 'pointer' }}>Deep dive →</div>
              </div>
              <div style={{ padding: '12px 18px 0', position: 'relative', height: 178 }}>
                <svg width="100%" height="148" viewBox="0 0 600 148" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="ytG2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#FF9933" stopOpacity="0.35"/><stop offset="100%" stopColor="#FF9933" stopOpacity="0"/></linearGradient>
                    <linearGradient id="igG2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#E1306C" stopOpacity="0.18"/><stop offset="100%" stopColor="#E1306C" stopOpacity="0"/></linearGradient>
                  </defs>
                  <path d="M0 100 C60 95,120 80,180 72 C240 64,300 30,360 20 C400 13,440 22,480 30 C520 38,560 42,600 38 L600 148 L0 148 Z" fill="url(#ytG2)"/>
                  <path d="M0 125 C60 120,120 110,180 105 C240 100,300 85,360 80 C400 76,440 80,480 82 C520 84,560 88,600 86 L600 148 L0 148 Z" fill="url(#igG2)"/>
                  <path d="M0 100 C60 95,120 80,180 72 C240 64,300 30,360 20 C400 13,440 22,480 30 C520 38,560 42,600 38" fill="none" stroke="#FF9933" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M0 125 C60 120,120 110,180 105 C240 100,300 85,360 80 C400 76,440 80,480 82 C520 84,560 88,600 86" fill="none" stroke="#E1306C" strokeWidth="1.5" strokeDasharray="5,4" strokeLinecap="round"/>
                  <circle cx="360" cy="20" r="4" fill="#FF9933"/>
                  <circle cx="360" cy="20" r="8" fill="rgba(255,153,51,0.2)"/>
                  <text x="0" y="148" fontSize="9" fill="#5A5A72" fontFamily="system-ui">Apr 15</text>
                  <text x="150" y="148" fontSize="9" fill="#5A5A72" fontFamily="system-ui">Apr 22</text>
                  <text x="295" y="148" fontSize="9" fill="#5A5A72" fontFamily="system-ui">Apr 29</text>
                  <text x="440" y="148" fontSize="9" fill="#5A5A72" fontFamily="system-ui">May 6</text>
                </svg>
                <div style={{ position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', background: '#1E1E28', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, padding: '3px 8px', fontSize: '0.65rem', fontWeight: 700, color: '#F0F0F8', whiteSpace: 'nowrap' }}>🔥 Mumbai spike</div>
              </div>
              <div style={{ display: 'flex', gap: 16, padding: '10px 18px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.7rem', color: '#7A7A90' }}><div style={{ width: 24, height: 2, background: '#FF9933', borderRadius: 2 }} /> YouTube</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.7rem', color: '#7A7A90' }}><div style={{ width: 24, height: 0, borderTop: '2px dashed #E1306C' }} /> Instagram</div>
              </div>
            </div>
            <div style={{ background: '#12121A', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700 }}>Platform Share</div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#FF9933', cursor: 'pointer' }}>All →</div>
              </div>
              <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { name: 'YouTube', pct: 72, val: '2.2M', color: '#FF0000' },
                  { name: 'Instagram', pct: 27, val: '8.4L', color: '#E1306C' },
                  { name: 'Stories', pct: 7, val: '2.18L', color: '#FBBF24' },
                  { name: 'X/Twitter', pct: 4, val: '1.2L', color: '#1DA1F2' },
                  { name: 'LinkedIn', pct: 1.5, val: '34K', color: '#0077B5' },
                  { name: 'WhatsApp', pct: 0.6, val: '8.2K', color: '#25D366' },
                ].map(p => (
                  <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: p.color, width: 72, flexShrink: 0 }}>{p.name}</div>
                    <div style={{ flex: 1, background: '#1E1E28', borderRadius: 20, height: 6, overflow: 'hidden' }}>
                      <div style={{ width: `${p.pct}%`, height: '100%', background: p.color, borderRadius: 20 }} />
                    </div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: p.color, width: 40, textAlign: 'right' as const }}>{p.val}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="responsive-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div style={{ background: '#12121A', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700 }}>Top Performing Content</div>
                <div onClick={() => router.push('/dashboard/library')} style={{ fontSize: '0.72rem', fontWeight: 700, color: '#FF9933', cursor: 'pointer' }}>View library →</div>
              </div>
              <div style={{ padding: '8px 18px' }}>
                {[
                  { title: 'Full Day in Mumbai — Street Food Edition', plats: ['youtube'], reach: '8.2L', delta: '↑ 34%', up: true, icon: '🎬' },
                  { title: 'Budget Travel Gear — Story Series (Part 1)', plats: ['instagram'], reach: '92K', delta: '↑ 51%', up: true, icon: '📖' },
                  { title: 'Morning in Manali — Vibe Story', plats: ['instagram', 'twitter'], reach: '55K', delta: '↑ 28%', up: true, icon: '✨' },
                  { title: 'How I Edit Videos in 2 Hours', plats: ['youtube'], reach: '1.45L', delta: '→ Stable', up: null, icon: '✂️' },
                ].map((p, i) => (
                  <div key={i} onClick={() => router.push('/dashboard/library')} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.06)' : 'none', cursor: 'pointer' }}>
                    <div style={{ width: 40, height: 40, borderRadius: 9, background: '#1E1E28', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>{p.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 4 }}>{p.title}</div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {p.plats.map(pl => <span key={pl} style={{ fontSize: '0.58rem', fontWeight: 800, padding: '1px 5px', borderRadius: 4, background: `${PC[pl]}22`, color: PC[pl], textTransform: 'uppercase' as const }}>{pl.slice(0,2).toUpperCase()}</span>)}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' as const, flexShrink: 0 }}>
                      <div style={{ fontSize: '0.88rem', fontWeight: 700 }}>{p.reach}</div>
                      <div style={{ fontSize: '0.65rem', fontWeight: 700, color: p.up === true ? '#34D399' : p.up === false ? '#F87171' : '#7A7A90' }}>{p.delta}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ background: '#12121A', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700 }}>Upcoming Queue</div>
                <div onClick={() => router.push('/dashboard/scheduler')} style={{ fontSize: '0.72rem', fontWeight: 700, color: '#FF9933', cursor: 'pointer' }}>Open calendar →</div>
              </div>
              <div style={{ padding: '8px 18px' }}>
                {[
                  { title: 'Manali on ₹5000 — 3 Day Itinerary', time: 'Today · 6:00 PM IST', tags: [{ l: 'YouTube', c: '#FF0000' }, { l: 'Instagram', c: '#E1306C' }], status: 'live', icon: '🏔️' },
                  { title: 'Sunrise from Triund — Morning Story', time: 'Today · 8:30 PM IST', tags: [{ l: 'Story', c: '#FBBF24' }, { l: 'X', c: '#1DA1F2' }], status: 'scheduled', icon: '🌅' },
                  { title: 'Backpacking Essentials — What I Pack', time: 'Tomorrow · 10:00 AM IST', tags: [{ l: 'YouTube', c: '#FF0000' }, { l: 'X', c: '#1DA1F2' }], status: 'scheduled', icon: '🎒' },
                  { title: 'Hyderabad Street Food — Reel', time: 'May 19 · 12:00 PM IST', tags: [{ l: 'Instagram', c: '#E1306C' }], status: 'draft', icon: '🍜' },
                ].map((q, i) => (
                  <div key={i} onClick={() => router.push('/dashboard/scheduler')} style={{ display: 'flex', alignItems: 'flex-start', gap: 11, padding: '10px 0', borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.06)' : 'none', cursor: 'pointer' }}>
                    <div style={{ width: 38, height: 38, borderRadius: 8, background: '#1E1E28', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>{q.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 3 }}>{q.title}</div>
                      <div style={{ fontSize: '0.65rem', color: '#5A5A72', marginBottom: 5 }}>{q.time}</div>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' as const }}>
                        {q.tags.map(t => <span key={t.l} style={{ fontSize: '0.6rem', fontWeight: 700, padding: '2px 7px', borderRadius: 5, background: `${t.c}18`, color: t.c }}>{t.l}</span>)}
                      </div>
                    </div>
                    <div style={{ flexShrink: 0, fontSize: '0.65rem', fontWeight: 700, paddingTop: 2, color: q.status === 'live' ? '#34D399' : q.status === 'scheduled' ? '#FF9933' : '#5A5A72' }}>
                      {q.status === 'live' ? '● Live' : q.status === 'scheduled' ? 'Scheduled' : 'Draft'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="responsive-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
            {[
              { icon: '🔥', label: 'Best Post Time', val: '6–8 PM IST', desc: 'Your audience is 2.3x more active on weekday evenings across all platforms' },
              { icon: '⚡', label: 'Retention Drop', val: 'First 7s', desc: '42% of Reel viewers leave before the 7-second mark — hook needs work' },
              { icon: '🎯', label: 'Top City', val: 'Mumbai', desc: '28% watch time · Delhi 19% · Bengaluru 14% · Hyderabad 10%' },
            ].map(ins => (
              <div key={ins.label} style={{ background: '#12121A', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '14px 16px', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.12)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLElement).style.transform = '' }}>
                <div style={{ fontSize: '1.4rem', marginBottom: 8 }}>{ins.icon}</div>
                <div style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: '#5A5A72', marginBottom: 4 }}>{ins.label}</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, letterSpacing: '-0.02em', color: '#F0F0F8', marginBottom: 5 }}>{ins.val}</div>
                <div style={{ fontSize: '0.7rem', color: '#7A7A90', lineHeight: 1.5 }}>{ins.desc}</div>
              </div>
            ))}
          </div>
        </div>
    </>
  )
}

// Real date-range picker — previously "📅 Apr 15 – May 15" was static text
// with a dropdown chevron that did nothing when clicked. The metric cards
// below are still labeled sample data (no analytics ingestion pipeline
// exists yet — see the banner above them), so picking a range here doesn't
// change those numbers; it's an honest, working control ready for when that
// pipeline lands, not a fake filter pretending to reslice fake data.
function DateRangeButton({ range, onChange }: { range: { start: Date; end: Date }; onChange: (r: { start: Date; end: Date }) => void }) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(range)

  const toISO = (d: Date) => d.toISOString().slice(0, 10)

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => { setDraft(range); setOpen(o => !o) }}
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.11)', background: '#18181F', fontSize: '0.78rem', fontWeight: 600, color: '#F0F0F8', cursor: 'pointer', fontFamily: 'inherit' }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.2)'}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.11)'}>
        📅 {fmt(range.start)} – {fmt(range.end)} ▾
      </button>
      {open && (
        <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 6, background: '#18181F', border: '1px solid rgba(255,255,255,0.11)', borderRadius: 10, padding: 14, zIndex: 20, display: 'flex', flexDirection: 'column', gap: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
          <label style={{ fontSize: '0.7rem', color: '#7A7A90', display: 'flex', flexDirection: 'column', gap: 4 }}>
            From
            <input type="date" value={toISO(draft.start)} max={toISO(draft.end)}
              onChange={e => setDraft(d => ({ ...d, start: new Date(e.target.value) }))}
              style={{ background: '#0E0E16', border: '1px solid rgba(255,255,255,0.11)', borderRadius: 6, padding: '5px 8px', color: '#F0F0F8', fontFamily: 'inherit', fontSize: '0.78rem' }} />
          </label>
          <label style={{ fontSize: '0.7rem', color: '#7A7A90', display: 'flex', flexDirection: 'column', gap: 4 }}>
            To
            <input type="date" value={toISO(draft.end)} min={toISO(draft.start)} max={toISO(new Date())}
              onChange={e => setDraft(d => ({ ...d, end: new Date(e.target.value) }))}
              style={{ background: '#0E0E16', border: '1px solid rgba(255,255,255,0.11)', borderRadius: 6, padding: '5px 8px', color: '#F0F0F8', fontFamily: 'inherit', fontSize: '0.78rem' }} />
          </label>
          <button onClick={() => { onChange(draft); setOpen(false) }}
            style={{ marginTop: 4, padding: '6px 0', borderRadius: 7, border: 'none', background: 'linear-gradient(135deg,#FF9933,#FF6B00)', fontSize: '0.75rem', fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>
            Apply
          </button>
        </div>
      )}
    </div>
  )
}

// Real workspace badge — previously "This Team ▾" was a dropdown-styled
// button that did nothing, implying team-switching that doesn't exist
// (every workspace has exactly one owner right now — see Team's honest
// "coming soon" page). This shows the actual workspace name and links to
// that page instead of pretending there's a team to switch between.
function WorkspaceButton() {
  const router = useRouter()
  const [name, setName] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/workspace')
      .then(res => res.json())
      .then(data => { if (data.success) setName(data.data.name) })
      .catch(() => {})
  }, [])

  return (
    <button onClick={() => router.push('/dashboard/team')}
      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.11)', background: '#18181F', fontSize: '0.78rem', fontWeight: 600, color: '#F0F0F8', cursor: 'pointer', fontFamily: 'inherit' }}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.2)'}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.11)'}>
      🏢 {name ?? 'My Workspace'}
    </button>
  )
}
