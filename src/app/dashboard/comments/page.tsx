// src/app/dashboard/comments/page.tsx
//
// Comments — honest "coming soon" page. There is no Comment model in the
// schema and no ingestion pipeline pulling comments from any platform's
// API yet, so there is nothing real to show. Rather than mock up fake
// comment threads, this says so directly.

'use client'
import Sidebar from '@/components/dashboard/Sidebar'
import ComingSoon from '@/components/dashboard/ComingSoon'

export default function CommentsPage() {
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#0A0A0F', fontFamily: 'system-ui, sans-serif', color: '#F0F0F8', WebkitFontSmoothing: 'antialiased' }}>
      <Sidebar active="comments" />
      <ComingSoon
        icon="💬"
        title="Unified comments inbox"
        subtitle="Not built yet — here's exactly what's true today"
        body="We don't yet pull comments from Instagram, YouTube, X, LinkedIn, Facebook, or WhatsApp into one inbox — that ingestion pipeline hasn't been built. When it lands, replies and moderation from every connected channel will show up here in one place."
      />
    </div>
  )
}
