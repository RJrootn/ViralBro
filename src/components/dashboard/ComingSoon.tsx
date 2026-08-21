// src/components/dashboard/ComingSoon.tsx
//
// Shared "honest empty state" for dashboard sections that don't have real
// data behind them yet (Team, Comments). Deliberately plain — no fake
// numbers, no fake avatars, no invented activity. Used instead of the kind
// of sample-data mockups that make a feature look further along than it is.

export default function ComingSoon({ icon, title, subtitle, body }: { icon: string; title: string; subtitle: string; body: string }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0E0E16' }}>
      <div style={{ height: 54, flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,#FF9933 33.33%,#fff 33.33% 66.66%,#138808 66.66%)' }} />
        <div style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '-0.01em' }}>{title}</div>
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ maxWidth: 440, textAlign: 'center' as const }}>
          <div style={{ fontSize: '2.2rem', marginBottom: 14 }}>{icon}</div>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#FF9933', marginBottom: 10 }}>{subtitle}</div>
          <div style={{ fontSize: '0.85rem', color: '#A0A0B8', lineHeight: 1.6 }}>{body}</div>
        </div>
      </div>
    </div>
  )
}
