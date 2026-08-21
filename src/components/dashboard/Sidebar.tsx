// src/components/dashboard/Sidebar.tsx
//
// Shared full sidebar for every /dashboard/* page (Dashboard, Content
// Library, Scheduler, Team, Comments, Notifications). Previously each page
// that wanted this sidebar copy-pasted ~90 lines of it inline (see the old
// src/app/dashboard/page.tsx) — several of those nav items (Scheduler,
// Content Library, Team, Comments, Notifications) just set local state and
// rendered nothing, so clicking them silently did nothing except highlight
// a different label. This component gives every one of those items a real
// route to navigate to instead.
//
// Studio (/studio) intentionally keeps its own slimmer, focus-mode sidebar
// (no workspace/connected-channels section) — that's a deliberate design
// difference for the content-creation flow, not an oversight.
//
// This component lives in src/app/dashboard/layout.tsx rather than being
// imported by each /dashboard/* page individually. That matters: mounting a
// fresh Sidebar per-page meant every click between sections re-fetched
// "Connected Channels" from an empty state, which is exactly the
// flash-then-populate lag that was visible when switching sections. Living
// in the layout instead means React keeps this component mounted across
// client-side navigations within /dashboard/* — the fetch runs once, not
// once per click. Active-item highlighting is derived from the current
// pathname instead of a prop, since the layout renders one Sidebar shared
// by every page under it.

'use client'
import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { PLATFORM_COLORS_BY_ENUM, PLATFORM_LABELS } from '@/lib/constants/platforms'
import { useConnectedAccounts } from '@/lib/hooks/useConnectedAccounts'

const LANGUAGES = ['भारत', 'ভারত', 'భారత్', 'ಭಾರತ', 'भारत', 'বাংলা', 'India']

export type SidebarPage =
  | 'dashboard' | 'studio' | 'scheduler' | 'library' | 'analytics'
  | 'team' | 'comments' | 'notifications' | 'settings'

const NAV_PATHS: Record<SidebarPage, string> = {
  dashboard:     '/dashboard',
  studio:        '/studio',
  scheduler:     '/dashboard/scheduler',
  library:       '/dashboard/library',
  analytics:     '/dashboard',
  team:          '/dashboard/team',
  comments:      '/dashboard/comments',
  notifications: '/dashboard/notifications',
  settings:      '/settings',
}

function activeFromPathname(pathname: string): SidebarPage {
  if (pathname.startsWith('/dashboard/library')) return 'library'
  if (pathname.startsWith('/dashboard/scheduler')) return 'scheduler'
  if (pathname.startsWith('/dashboard/team')) return 'team'
  if (pathname.startsWith('/dashboard/comments')) return 'comments'
  if (pathname.startsWith('/dashboard/notifications')) return 'notifications'
  if (pathname.startsWith('/settings')) return 'settings'
  if (pathname.startsWith('/studio')) return 'studio'
  return 'dashboard'
}

export default function Sidebar() {
  const { data: session } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const active = activeFromPathname(pathname ?? '/dashboard')
  const [langIdx, setLangIdx] = useState(0)
  const accounts = useConnectedAccounts()

  useEffect(() => {
    const interval = setInterval(() => setLangIdx(i => (i + 1) % LANGUAGES.length), 1800)
    return () => clearInterval(interval)
  }, [])

  const nav = (page: SidebarPage) => router.push(NAV_PATHS[page])

  return (
    <aside style={{ width: 220, flexShrink: 0, background: '#12121A', borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', height: '100vh', overflowY: 'auto' }}>
      <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <BharatFlag />
          <span style={{ fontWeight: 900, fontSize: '1.1rem', letterSpacing: '-0.01em' }}>
            Vyral<span style={{ color: '#FF9933' }}>Bro</span>
          </span>
          <span style={{ fontSize: '0.58rem', fontWeight: 700, background: 'rgba(37,211,102,0.1)', color: '#25D366', border: '1px solid rgba(37,211,102,0.25)', borderRadius: 20, padding: '2px 7px', minWidth: 36, textAlign: 'center' as const, transition: 'all 0.4s' }}>
            {LANGUAGES[langIdx]}
          </span>
        </div>
      </div>
      <div style={{ padding: '8px 0' }}>
        <SbLabel>Main</SbLabel>
        <SbItem icon="⊞" label="Dashboard" active={active === 'dashboard' || active === 'analytics'} onClick={() => nav('dashboard')} />
        <SbItem icon="✍️" label="Post Content" badge="NEW" onClick={() => nav('studio')} />
        <SbItem icon="📅" label="Scheduler" active={active === 'scheduler'} onClick={() => nav('scheduler')} />
        <SbItem icon="📚" label="Content Library" active={active === 'library'} onClick={() => nav('library')} />
        <SbLabel>Workspace</SbLabel>
        <SbItem icon="👥" label="Team" active={active === 'team'} onClick={() => nav('team')} />
        <SbItem icon="💬" label="Comments" active={active === 'comments'} onClick={() => nav('comments')} />
        <SbItem icon="🔔" label="Notifications" active={active === 'notifications'} onClick={() => nav('notifications')} />
        <SbItem icon="⚙️" label="Settings" active={active === 'settings'} onClick={() => nav('settings')} />
      </div>
      <div style={{ padding: '12px 12px 8px', borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 'auto' }}>
        <div style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: '#5A5A72', marginBottom: 10 }}>Connected Channels</div>
        {accounts.length === 0 && (
          <div style={{ fontSize: '0.72rem', color: '#5A5A72', marginBottom: 8 }}>None connected yet</div>
        )}
        {accounts.map(ch => (
          <div key={ch.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: PLATFORM_COLORS_BY_ENUM[ch.platform] ?? '#7A7A90', boxShadow: `0 0 5px ${PLATFORM_COLORS_BY_ENUM[ch.platform] ?? '#7A7A90'}`, flexShrink: 0 }} />
            <span style={{ fontSize: '0.78rem', fontWeight: 500, flex: 1 }}>{PLATFORM_LABELS[ch.platform] ?? ch.platform}</span>
            <span style={{ fontSize: '0.72rem', color: '#7A7A90' }}>@{ch.platformUsername}</span>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#34D399' }} />
          </div>
        ))}
        <div onClick={() => router.push('/settings')} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px', marginTop: 6, border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 9, cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, color: '#5A5A72' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#FF9933'; e.currentTarget.style.color = '#FF9933' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#5A5A72' }}>
          + Add Channel
        </div>
      </div>
      <div style={{ padding: '12px 12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 9 }}>
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
  )
}

function SbLabel({ children }: { children: string }) {
  return <div style={{ padding: '16px 16px 6px', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: '#3A3A52' }}>{children}</div>
}

function SbItem({ icon, label, active, badge, onClick }: { icon: string; label: string; active?: boolean; badge?: string; onClick?: () => void }) {
  return (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 10px', margin: '1px 6px', borderRadius: 9, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 500, color: active ? '#FF9933' : '#7A7A90', background: active ? 'rgba(255,153,51,0.1)' : 'transparent', transition: 'all 0.15s' }}
      onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = '#18181F'; (e.currentTarget as HTMLElement).style.color = '#F0F0F8' } }}
      onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#7A7A90' } }}>
      <span style={{ fontSize: '0.9rem', width: 16, textAlign: 'center' as const }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {badge && <span style={{ fontSize: '0.58rem', fontWeight: 700, background: '#FF9933', color: '#fff', padding: '1px 6px', borderRadius: 20 }}>{badge}</span>}
    </div>
  )
}

function BharatFlag() {
  return (
    <svg width="28" height="20" viewBox="0 0 30 21" style={{ borderRadius: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.5)', flexShrink: 0, display: 'block' }}>
      <rect x="0" y="0" width="30" height="7" fill="#FF9933" />
      <rect x="0" y="7" width="30" height="7" fill="#FFFFFF" />
      <rect x="0" y="14" width="30" height="7" fill="#138808" />
      <circle cx="15" cy="10.5" r="3" fill="none" stroke="#000080" strokeWidth="0.6" />
      <circle cx="15" cy="10.5" r="0.8" fill="#000080" />
      <g stroke="#000080" strokeWidth="0.4">
        <line x1="15" y1="7.5" x2="15" y2="8.8" /><line x1="15" y1="12.2" x2="15" y2="13.5" />
        <line x1="12" y1="10.5" x2="13.3" y2="10.5" /><line x1="16.7" y1="10.5" x2="18" y2="10.5" />
        <line x1="12.88" y1="8.38" x2="13.8" y2="9.3" /><line x1="16.2" y1="11.7" x2="17.12" y2="12.62" />
        <line x1="17.12" y1="8.38" x2="16.2" y2="9.3" /><line x1="13.8" y1="11.7" x2="12.88" y2="12.62" />
      </g>
    </svg>
  )
}
