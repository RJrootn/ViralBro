'use client'
import { useSession, signOut } from 'next-auth/react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const PC: Record<string, string> = {
  instagram: '#E1306C', twitter: '#1DA1F2', linkedin: '#0077B5',
  youtube: '#FF0000', facebook: '#1877F2', whatsapp: '#25D366',
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [activePage, setActivePage] = useState('dashboard')

  const nav = (page: string) => {
    if (page === 'studio') { router.push('/studio'); return }
    setActivePage(page)
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#0A0A0F', fontFamily: 'system-ui, sans-serif', color: '#F0F0F8', WebkitFontSmoothing: 'antialiased' }}>

      {/* ── SIDEBAR ── */}
      <aside style={{ width: 220, flexShrink: 0, background: '#12121A', borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', height: '100vh', overflowY: 'auto' }}>

        {/* Brand */}
        <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <BharatFlag />
            <span style={{ fontWeight: 900, fontSize: '1.1rem', letterSpacing: '-0.01em' }}>
              Vy<span style={{ color: '#FF9933' }}>ral</span>
            </span>
            <span style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, background: 'linear-gradient(135deg,#FF9933,#FF6B00)', color: '#fff', padding: '2px 6px', borderRadius: 4 }}>Pro</span>
          </div>
        </div>

        {/* Nav */}
        <div style={{ padding: '8px 0' }}>
          <SbLabel>Main</SbLabel>
          <SbItem icon="⊞" label="Dashboard" active={activePage === 'dashboard'} onClick={() => nav('dashboard')} />
          <SbItem icon="✍️" label="Post Content" badge="NEW" onClick={() => nav('studio')} />
          <SbItem icon="📅" label="Scheduler" dot="#25D366" onClick={() => nav('scheduler')} />
          <SbItem icon="📚" label="Content Library" onClick={() => nav('library')} />
          <SbItem icon="📊" label="Analytics" onClick={() => nav('analytics')} />
          <SbLabel>Workspace</SbLabel>
          <SbItem icon="👥" label="Team" badge2="2" onClick={() => nav('team')} />
          <SbItem icon="💬" label="Comments" onClick={() => nav('comments')} />
          <SbItem icon="🔔" label="Notifications" onClick={() => nav('notifications')} />
          <SbItem icon="⚙️" label="Settings" onClick={() => nav('settings')} />
        </div>

        {/* Connected channels */}
        <div style={{ padding: '12px 12px 8px', borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 'auto' }}>
          <div style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: '#5A5A72', marginBottom: 10 }}>Connected Channels</div>
          {[
            { name: 'YouTube',   count: '2.1M', color: '#FF0000' },
            { name: 'Instagram', count: '8.4L', color: '#E1306C' },
            { name: 'X/Twitter', count: '1.2L', color: '#1DA1F2' },
            { name: 'LinkedIn',  count: '34K',  color: '#0077B5' },
            { name: 'WhatsApp',  count: '8.2K', color: '#25D366' },
          ].map(ch => (
            <div key={ch.name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', cursor: 'pointer' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: ch.color, boxShadow: `0 0 5px ${ch.color}`, flexShrink: 0 }} />
              <span style={{ fontSize: '0.78rem', fontWeight: 500, flex: 1 }}>{ch.name}</span>
              <span style={{ fontSize: '0.72rem', color: '#7A7A90' }}>{ch.count}</span>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#34D399' }} />
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 8px', marginTop: 6, border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 9, cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, color: '#5A5A72' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#FF9933'; e.currentTarget.style.color = '#FF9933' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#5A5A72' }}>
            + Add Channel
          </div>
        </div>

        {/* User */}
        <div style={{ padding: '12px 12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer' }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,#FF9933,#138808)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800, color: '#fff', flexShrink: 0 }}>
            {session?.user?.name?.charAt(0) ?? 'R'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{session?.user?.name ?? 'Creator'}</div>
            <div style={{ fontSize: '0.65rem', color: '#5A5A72' }}>Owner</div>
          </div>
          <span style={{ fontSize: '0.7rem', color: '#5A5A72', cursor: 'pointer' }} onClick={() => signOut({ callbackUrl: '/login' })}>⏻</span>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0E0E16' }}>

        {/* Topbar */}
        <div style={{ height: 54, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,#FF9933 33.33%,#fff 33.33% 66.66%,#138808 66.66%)' }} />
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '-0.01em' }}>Dashboard</div>
            <div style={{ fontSize: '0.72rem', color: '#5A5A72' }}>Last 30 days · All channels combined</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <TbBtn label="📅 Apr 15 – May 15" />
            <TbBtn label="This Team" />
            <button
              onClick={() => router.push('/studio')}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg,#FF9933,#FF6B00)', fontSize: '0.78rem', fontWeight: 700, color: '#fff', cursor: 'pointer', boxShadow: '0 2px 12px rgba(255,153,51,0.3)', fontFamily: 'inherit' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
              onMouseLeave={e => e.currentTarget.style.transform = ''}
            >
              + Post Content
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px 24px' }}>

          {/* Metric cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Total Reach',      val: '3.09M', delta: '↑ 18.4% vs last month', up: true,  icon: '📡', color: '#FF9933' },
              { label: 'Avg. Engagement',  val: '6.7%',  delta: '↑ 2.1pp all platforms', up: true,  icon: '💬', color: '#8B5CF6' },
              { label: 'Posts Published',  val: '36',    delta: '↑ 12 vs last month',    up: true,  icon: '📝', color: '#25D366' },
              { label: 'Watch Hours',      val: '41.2K', delta: '↓ 3.2% — needs fix',   up: false, icon: '⏱', color: '#FBBF24' },
              { label: 'Story Views',      val: '2.18L', delta: '↑ 41% — best ever!',   up: true,  icon: '👁', color: '#60A5FA' },
            ].map(m => (
              <div key={m.label} style={{ background: '#12121A', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '14px 16px', position: 'relative', overflow: 'hidden', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.12)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: m.color }} />
                <div style={{ fontSize: '0.9rem', marginBottom: 8 }}>{m.icon}</div>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase' as const, color: '#7A7A90', marginBottom: 4 }}>{m.label}</div>
                <div style={{ fontSize: '1.7rem', fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1, color: '#F0F0F8', marginBottom: 6 }}>{m.val}</div>
                <div style={{ fontSize: '0.7rem', fontWeight: 600, color: m.up ? '#34D399' : '#F87171' }}>{m.delta}</div>
              </div>
            ))}
          </div>

          {/* Charts row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16, marginBottom: 16 }}>

            {/* Reach trend */}
            <div style={{ background: '#12121A', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#F0F0F8' }}>Reach Trend — All Platforms</div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#FF9933', cursor: 'pointer' }}>Deep dive →</div>
              </div>
              <div style={{ padding: '12px 18px 0', position: 'relative', height: 178 }}>
                <svg width="100%" height="148" viewBox="0 0 600 148" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="ytG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FF9933" stopOpacity="0.35"/>
                      <stop offset="100%" stopColor="#FF9933" stopOpacity="0"/>
                    </linearGradient>
                    <linearGradient id="igG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#E1306C" stopOpacity="0.18"/>
                      <stop offset="100%" stopColor="#E1306C" stopOpacity="0"/>
                    </linearGradient>
                  </defs>
                  <path d="M0 100 C60 95,120 80,180 72 C240 64,300 30,360 20 C400 13,440 22,480 30 C520 38,560 42,600 38 L600 148 L0 148 Z" fill="url(#ytG)"/>
                  <path d="M0 125 C60 120,120 110,180 105 C240 100,300 85,360 80 C400 76,440 80,480 82 C520 84,560 88,600 86 L600 148 L0 148 Z" fill="url(#igG)"/>
                  <path d="M0 100 C60 95,120 80,180 72 C240 64,300 30,360 20 C400 13,440 22,480 30 C520 38,560 42,600 38" fill="none" stroke="#FF9933" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M0 125 C60 120,120 110,180 105 C240 100,300 85,360 80 C400 76,440 80,480 82 C520 84,560 88,600 86" fill="none" stroke="#E1306C" strokeWidth="1.5" strokeDasharray="5,4" strokeLinecap="round"/>
                  <circle cx="360" cy="20" r="4" fill="#FF9933"/>
                  <circle cx="360" cy="20" r="8" fill="rgba(255,153,51,0.2)"/>
                  <text x="0" y="148" fontSize="9" fill="#5A5A72" fontFamily="system-ui">Apr 15</text>
                  <text x="150" y="148" fontSize="9" fill="#5A5A72" fontFamily="system-ui">Apr 22</text>
                  <text x="295" y="148" fontSize="9" fill="#5A5A72" fontFamily="system-ui">Apr 29</text>
                  <text x="440" y="148" fontSize="9" fill="#5A5A72" fontFamily="system-ui">May 6</text>
                </svg>
                <div style={{ position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', background: '#1E1E28', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, padding: '3px 8px', fontSize: '0.65rem', fontWeight: 700, color: '#F0F0F8', whiteSpace: 'nowrap' }}>
                  🔥 Mumbai spike
                </div>
              </div>
              <div style={{ display: 'flex', gap: 16, padding: '10px 18px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.7rem', color: '#7A7A90' }}>
                  <div style={{ width: 24, height: 2, background: '#FF9933', borderRadius: 2 }} /> YouTube
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.7rem', color: '#7A7A90' }}>
                  <div style={{ width: 24, height: 0, borderTop: '2px dashed #E1306C' }} /> Instagram
                </div>
              </div>
            </div>

            {/* Platform share */}
            <div style={{ background: '#12121A', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700 }}>Platform Share</div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#FF9933', cursor: 'pointer' }}>All →</div>
              </div>
              <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { name: 'YouTube',   pct: 72, val: '2.2M',  color: '#FF0000' },
                  { name: 'Instagram', pct: 27, val: '8.4L',  color: '#E1306C' },
                  { name: 'Stories',   pct: 7,  val: '2.18L', color: '#FBBF24' },
                  { name: 'X/Twitter', pct: 4,  val: '1.2L',  color: '#1DA1F2' },
                  { name: 'LinkedIn',  pct: 1.5,val: '34K',   color: '#0077B5' },
                  { name: 'WhatsApp',  pct: 0.6,val: '8.2K',  color: '#25D366' },
                ].map(p => (
                  <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: p.color, width: 72, flexShrink: 0 }}>{p.name}</div>
                    <div style={{ flex: 1, background: '#1E1E28', borderRadius: 20, height: 6, overflow: 'hidden' }}>
                      <div style={{ width: `${p.pct}%`, height: '100%', background: p.color, borderRadius: 20, transition: 'width 1s ease' }} />
                    </div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: p.color, width: 40, textAlign: 'right' as const }}>{p.val}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

            {/* Top content */}
            <div style={{ background: '#12121A', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700 }}>Top Performing Content</div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#FF9933', cursor: 'pointer' }}>View library →</div>
              </div>
              <div style={{ padding: '8px 18px' }}>
                {[
                  { title: 'Full Day in Mumbai — Street Food Edition', plats: ['youtube'], reach: '8.2L', delta: '↑ 34%', up: true, icon: '🎬' },
                  { title: 'Budget Travel Gear — Story Series (Part 1)', plats: ['instagram'], reach: '92K', delta: '↑ 51%', up: true, icon: '📖' },
                  { title: 'Morning in Manali — Vibe Story', plats: ['instagram', 'twitter'], reach: '55K', delta: '↑ 28%', up: true, icon: '✨' },
                  { title: 'How I Edit Videos in 2 Hours (Full Process)', plats: ['youtube'], reach: '1.45L', delta: '→ Stable', up: null, icon: '✂️' },
                ].map((p, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.06)' : 'none', cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '0.8'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '1'}>
                    <div style={{ width: 40, height: 40, borderRadius: 9, background: '#1E1E28', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>{p.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#F0F0F8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 4 }}>{p.title}</div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {p.plats.map(pl => (
                          <span key={pl} style={{ fontSize: '0.58rem', fontWeight: 800, padding: '1px 5px', borderRadius: 4, background: `${PC[pl]}22`, color: PC[pl], textTransform: 'uppercase' as const }}>{pl.slice(0,2).toUpperCase()}</span>
                        ))}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' as const, flexShrink: 0 }}>
                      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#F0F0F8' }}>{p.reach}</div>
                      <div style={{ fontSize: '0.65rem', fontWeight: 700, color: p.up === true ? '#34D399' : p.up === false ? '#F87171' : '#7A7A90' }}>{p.delta}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Queue */}
            <div style={{ background: '#12121A', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700 }}>Upcoming Queue</div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#FF9933', cursor: 'pointer' }}>Open calendar →</div>
              </div>
              <div style={{ padding: '8px 18px' }}>
                {[
                  { title: 'Manali on ₹5000 — 3 Day Itinerary', time: 'Today · 6:00 PM IST', tags: [{ l: 'YouTube', c: '#FF0000' }, { l: 'Instagram', c: '#E1306C' }], status: 'live', icon: '🏔️' },
                  { title: 'Sunrise from Triund — Morning Story', time: 'Today · 8:30 PM IST', tags: [{ l: 'Story', c: '#FBBF24' }, { l: 'X', c: '#1DA1F2' }], status: 'scheduled', icon: '🌅' },
                  { title: 'Backpacking Essentials — What I Pack', time: 'Tomorrow · 10:00 AM IST', tags: [{ l: 'YouTube', c: '#FF0000' }, { l: 'X', c: '#1DA1F2' }], status: 'scheduled', icon: '🎒' },
                  { title: 'Hyderabad Street Food — Reel', time: 'May 19 · 12:00 PM IST', tags: [{ l: 'Instagram', c: '#E1306C' }], status: 'draft', icon: '🍜' },
                ].map((q, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 11, padding: '10px 0', borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.06)' : 'none', cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '0.8'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '1'}>
                    <div style={{ width: 38, height: 38, borderRadius: 8, background: '#1E1E28', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>{q.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#F0F0F8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 3 }}>{q.title}</div>
                      <div style={{ fontSize: '0.65rem', color: '#5A5A72', marginBottom: 5 }}>{q.time}</div>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' as const }}>
                        {q.tags.map(t => (
                          <span key={t.l} style={{ fontSize: '0.6rem', fontWeight: 700, padding: '2px 7px', borderRadius: 5, background: `${t.c}18`, color: t.c }}>{t.l}</span>
                        ))}
                      </div>
                    </div>
                    <div style={{ flexShrink: 0, fontSize: '0.65rem', fontWeight: 700, paddingTop: 2,
                      color: q.status === 'live' ? '#34D399' : q.status === 'scheduled' ? '#FF9933' : '#5A5A72' }}>
                      {q.status === 'live' ? '● Live' : q.status === 'scheduled' ? 'Scheduled' : 'Draft'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Insight cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
            {[
              { icon: '🔥', label: 'Best Post Time',    val: '6–8 PM IST',  desc: 'Your audience is 2.3× more active on weekday evenings across all platforms' },
              { icon: '⚡', label: 'Retention Drop',    val: 'First 7s',    desc: '42% of Reel viewers leave before the 7-second mark — hook needs work' },
              { icon: '🎯', label: 'Top City',          val: 'Mumbai',      desc: '28% watch time · Delhi 19% · Bengaluru 14% · Hyderabad 10%' },
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
      </div>
    </div>
  )
}

function SbLabel({ children }: { children: string }) {
  return <div style={{ padding: '16px 16px 6px', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: '#3A3A52' }}>{children}</div>
}

function SbItem({ icon, label, active, badge, badge2, dot, onClick }: { icon: string; label: string; active?: boolean; badge?: string; badge2?: string; dot?: string; onClick?: () => void }) {
  return (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 10px', margin: '1px 6px', borderRadius: 9, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 500, color: active ? '#FF9933' : '#7A7A90', background: active ? 'rgba(255,153,51,0.1)' : 'transparent', transition: 'all 0.15s' }}
      onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = '#18181F'; (e.currentTarget as HTMLElement).style.color = '#F0F0F8' } }}
      onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#7A7A90' } }}>
      <span style={{ fontSize: '0.9rem', width: 16, textAlign: 'center' as const }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {badge && <span style={{ fontSize: '0.58rem', fontWeight: 700, background: '#FF9933', color: '#fff', padding: '1px 6px', borderRadius: 20 }}>{badge}</span>}
      {badge2 && <span style={{ fontSize: '0.58rem', fontWeight: 700, background: '#34D399', color: '#fff', padding: '1px 6px', borderRadius: 20 }}>{badge2}</span>}
      {dot && <div style={{ width: 6, height: 6, borderRadius: '50%', background: dot }} />}
    </div>
  )
}

function TbBtn({ label }: { label: string }) {
  return (
    <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.11)', background: '#18181F', fontSize: '0.78rem', fontWeight: 600, color: '#F0F0F8', cursor: 'pointer', fontFamily: 'inherit' }}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.2)'}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.11)'}>
      {label} ▾
    </button>
  )
}

function BharatFlag() {
  return (
    <div style={{ width: 28, height: 20, borderRadius: 3, overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 2px 8px rgba(0,0,0,0.5)', flexShrink: 0 }}>
      <div style={{ flex: 1, background: '#FF9933' }} />
      <div style={{ flex: 1, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="#000080" strokeWidth="1.5"/>
          <circle cx="12" cy="12" r="2.5" fill="#000080"/>
          <g stroke="#000080" strokeWidth="0.8">
            <line x1="12" y1="2" x2="12" y2="5.5"/><line x1="12" y1="18.5" x2="12" y2="22"/>
            <line x1="2" y1="12" x2="5.5" y2="12"/><line x1="18.5" y1="12" x2="22" y2="12"/>
            <line x1="4.34" y1="4.34" x2="6.82" y2="6.82"/><line x1="17.18" y1="17.18" x2="19.66" y2="19.66"/>
            <line x1="19.66" y1="4.34" x2="17.18" y2="6.82"/><line x1="6.82" y1="17.18" x2="4.34" y2="19.66"/>
          </g>
        </svg>
      </div>
      <div style={{ flex: 1, background: '#138808' }} />
    </div>
  )
}
