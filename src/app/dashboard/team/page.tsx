// src/app/dashboard/team/page.tsx
//
// Team — honest "coming soon" page. The schema only supports one user per
// workspace right now (Workspace.userId is @unique), so there is no real
// multi-user/team data to show. The old dashboard page used to render a
// fake "2" badge next to "Team" in the sidebar — that was fabricated and
// has been removed. This page says plainly what's true instead of faking
// team members that don't exist.

'use client'
import Sidebar from '@/components/dashboard/Sidebar'
import ComingSoon from '@/components/dashboard/ComingSoon'

export default function TeamPage() {
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#0A0A0F', fontFamily: 'system-ui, sans-serif', color: '#F0F0F8', WebkitFontSmoothing: 'antialiased' }}>
      <Sidebar active="team" />
      <ComingSoon
        icon="👥"
        title="Team workspaces"
        subtitle="Not built yet — here's exactly what's true today"
        body="Right now every workspace belongs to a single owner, so there's no team to show here. Multi-user workspaces (invites, roles, shared approval) are on the roadmap but not live yet — we'd rather tell you that plainly than show you fake teammates."
      />
    </div>
  )
}
