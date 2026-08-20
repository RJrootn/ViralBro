'use client'
// src/app/settings/page.tsx
//
// This page didn't exist before — PlatformConnector.tsx (the connect/disconnect
// UI) was fully built but never mounted anywhere, so there was no way for a
// user to actually connect a social account through the app. Studio's
// "Publish All" needs a socialAccountId per platform, which only exists once
// an account is connected here.

import { useRouter } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { PlatformConnector } from '@/components/platforms/PlatformConnector'

export default function SettingsPage() {
  const router = useRouter()
  const { data: session } = useSession()

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0A0A0F', fontFamily: 'system-ui, sans-serif', color: '#F0F0F8' }}>
      <aside style={{ width: 220, flexShrink: 0, background: '#12121A', borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <span style={{ fontWeight: 900, fontSize: '1.1rem' }}>Vyral<span style={{ color: '#FF9933' }}>Bro</span></span>
        </div>
        <div style={{ padding: '8px 0', flex: 1 }}>
          {[
            { icon: '⊞', label: 'Dashboard', path: '/dashboard' },
            { icon: '✍️', label: 'Post Content', path: '/studio' },
            { icon: '🔌', label: 'Settings', path: '/settings', active: true },
          ].map(item => (
            <div key={item.label} onClick={() => router.push(item.path)}
              style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 10px', margin: '1px 6px', borderRadius: 9, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 500, color: item.active ? '#FF9933' : '#7A7A90', background: item.active ? 'rgba(255,153,51,0.1)' : 'transparent' }}>
              <span style={{ fontSize: '0.9rem', width: 16, textAlign: 'center' as const }}>{item.icon}</span>
              {item.label}
            </div>
          ))}
        </div>
        <div style={{ padding: '12px 12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,#FF9933,#138808)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800, color: '#fff', flexShrink: 0 }}>
            {session?.user?.name?.charAt(0) ?? 'R'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{session?.user?.name ?? 'Creator'}</div>
          </div>
          <span style={{ fontSize: '0.7rem', color: '#5A5A72', cursor: 'pointer' }} onClick={() => signOut({ callbackUrl: '/login' })}>⏻</span>
        </div>
      </aside>

      <div style={{ flex: 1, padding: '2rem 2.5rem', maxWidth: 1100 }}>
        <PlatformConnector />
      </div>
    </div>
  )
}
