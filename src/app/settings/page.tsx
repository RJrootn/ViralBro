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

import { PlatformConnector } from '@/components/platforms/PlatformConnector'
import Sidebar from '@/components/dashboard/Sidebar'

export default function SettingsPage() {
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#0A0A0F', fontFamily: 'system-ui, sans-serif', color: '#F0F0F8', WebkitFontSmoothing: 'antialiased' }}>
      <Sidebar />
      <div className="mobile-tighten-padding" style={{ flex: 1, overflowY: 'auto', padding: '2rem 2.5rem' }}>
        <div style={{ maxWidth: 1100 }}>
          <PlatformConnector />
        </div>
      </div>
    </div>
  )
}
