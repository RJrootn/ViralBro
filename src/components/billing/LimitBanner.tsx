// src/components/billing/LimitBanner.tsx
//
// Persistent "you're blocked, here's the fix" banner for a 402 plan-limit
// response — used in Studio when generate/publish gets rejected for
// exceeding the plan's posts/month, AI credits, or platform-per-post cap.
// Deliberately not a toast: a message that vanishes in 3 seconds is the
// wrong shape for "this is why you're stuck and here's what to do."

'use client'
import { useRouter } from 'next/navigation'

export default function LimitBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  const router = useRouter()
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, background: 'rgba(255,153,51,0.08)', border: '1px solid rgba(255,153,51,0.3)', borderRadius: 12, padding: '12px 16px' }}>
      <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>🔒</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.82rem', color: '#F2F2F8', lineHeight: 1.5 }}>{message}</div>
        <button
          onClick={() => router.push('/settings?tab=billing')}
          style={{ marginTop: 8, padding: '6px 14px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#FF9933,#FF6B00)', color: '#fff', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          View plans & upgrade →
        </button>
      </div>
      <span onClick={onDismiss} style={{ cursor: 'pointer', color: '#7A7A90', fontSize: '0.9rem', flexShrink: 0 }}>✕</span>
    </div>
  )
}
