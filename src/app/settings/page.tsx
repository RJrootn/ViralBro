'use client'
// src/app/settings/page.tsx
//
// This page used to have its own third bespoke sidebar copy — separate from
// both the shared /dashboard/* Sidebar and Studio's mini-sidebar — which
// didn't show Connected Channels at all and looked visibly different from
// the rest of the app. It now uses the same shared Sidebar component as
// every /dashboard/* page, so the nav and the Connected Channels list look
// and behave identically everywhere, and (via useConnectedAccounts' cache)
// show up instantly instead of re-fetching from empty on every visit.
//
// Settings intentionally stays its own top-level route (/settings) rather
// than moving under /dashboard/settings — every OAuth provider callback
// (instagram/twitter/linkedin/... callback routes) redirects back to
// /settings?platform=...&success=..., and changing that redirect target
// across every provider is a separate, riskier change than this one.

'use client'
import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { PlatformConnector } from '@/components/platforms/PlatformConnector'
import Sidebar from '@/components/dashboard/Sidebar'
import BillingPanel from '@/components/billing/BillingPanel'

type Tab = 'channels' | 'billing'

function SettingsTabs() {
  const router = useRouter()
  const searchParams = useSearchParams()
  // ?tab=billing lets other pages (the sidebar's Upgrade link, Studio's
  // limit banner) deep-link straight into the Billing tab instead of
  // dumping someone on Connected Channels and making them find it.
  const initialTab: Tab = searchParams?.get('tab') === 'billing' ? 'billing' : 'channels'
  const [tab, setTab] = useState<Tab>(initialTab)

  const selectTab = (t: Tab) => {
    setTab(t)
    router.replace(t === 'billing' ? '/settings?tab=billing' : '/settings', { scroll: false })
  }

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 24, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        {(['channels', 'billing'] as const).map(t => (
          <div key={t} onClick={() => selectTab(t)}
            style={{
              padding: '10px 4px', marginRight: 22, cursor: 'pointer', fontSize: '0.86rem', fontWeight: 700,
              color: tab === t ? '#FF9933' : '#7A7A90',
              borderBottom: tab === t ? '2px solid #FF9933' : '2px solid transparent',
            }}>
            {t === 'channels' ? 'Connected Channels' : 'Billing'}
          </div>
        ))}
      </div>
      {tab === 'channels' ? <PlatformConnector /> : <BillingPanel />}
    </div>
  )
}

export default function SettingsPage() {
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#0A0A0F', fontFamily: 'system-ui, sans-serif', color: '#F0F0F8', WebkitFontSmoothing: 'antialiased' }}>
      <Sidebar />
      <div className="mobile-tighten-padding" style={{ flex: 1, overflowY: 'auto', padding: '2rem 2.5rem' }}>
        <Suspense fallback={null}>
          <SettingsTabs />
        </Suspense>
      </div>
    </div>
  )
}
