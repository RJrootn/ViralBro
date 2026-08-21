// src/app/dashboard/layout.tsx
//
// Shared layout for every /dashboard/* page. Renders the Sidebar once here
// instead of each page mounting its own copy — Next's App Router keeps this
// layout mounted across client-side navigation between sibling routes, so
// the sidebar (and its "Connected Channels" fetch) survives clicks between
// Dashboard/Library/Scheduler/Team/Comments/Notifications instead of
// re-fetching and flashing empty every time.

import Sidebar from '@/components/dashboard/Sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#0A0A0F', fontFamily: 'system-ui, sans-serif', color: '#F0F0F8', WebkitFontSmoothing: 'antialiased' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0E0E16' }}>
        {children}
      </div>
    </div>
  )
}
