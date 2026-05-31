'use client'
import { signIn, useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function LoginPage() {
  const { status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (status === 'authenticated') router.replace('/dashboard')
  }, [status, router])

  async function handleGoogle() {
    setLoading(true)
    await signIn('google', { callbackUrl: '/dashboard' })
  }

  return (
    <div style={{
      height: '100vh', display: 'flex', overflow: 'hidden',
      fontFamily: 'system-ui, sans-serif',
      background: '#06060A', color: '#F2F2F8',
      WebkitFontSmoothing: 'antialiased',
    }}>
      <Left />
      <Right error={error} loading={loading} status={status} onGoogle={handleGoogle} />
    </div>
  )
}

function Left() {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#111118', borderRight: '1px solid rgba(255,255,255,0.06)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg,#FF9933 33.33%,#fff 33.33% 66.66%,#138808 66.66%)', zIndex: 2 }} />
      <div style={{ position: 'absolute', top: -100, left: -80, width: 500, height: 400, borderRadius: '50%', background: '#FF9933', opacity: 0.1, filter: 'blur(130px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -120, right: -80, width: 450, height: 450, borderRadius: '50%', background: '#138808', opacity: 0.08, filter: 'blur(130px)', pointerEvents: 'none' }} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '44px 52px', justifyContent: 'space-between', position: 'relative', zIndex: 1, overflowY: 'auto' }}>

        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <BharatFlag />
          <span style={{ fontWeight: 900, fontSize: '1.4rem', letterSpacing: '-0.01em' }}>
            Vy<span style={{ color: '#FF9933' }}>ral</span>
          </span>
          <span style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#25D366', background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.2)', borderRadius: 20, padding: '2px 9px' }}>
            भारत
          </span>
        </div>

        {/* Hero */}
        <div>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#FF9933', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ display: 'inline-block', width: 24, height: 1, background: '#FF9933', flexShrink: 0 }} />
            India&apos;s Creator OS
          </div>
          <h1 style={{ fontWeight: 900, fontSize: '2.8rem', lineHeight: 1.08, letterSpacing: '-0.03em', color: '#F2F2F8', marginBottom: 18 }}>
            Write once.<br />
            <span style={{ color: '#FF9933', fontStyle: 'italic' }}>Reach Bharat.</span>
          </h1>
          <p style={{ fontSize: '0.9rem', color: '#8585A0', lineHeight: 1.7, maxWidth: 380 }}>
            One idea &rarr; 6 platforms, AI-adapted in your voice and language. Instagram, YouTube, LinkedIn, WhatsApp &mdash; all from one dashboard.
          </p>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 28, marginTop: 36 }}>
            {[
              { val: '12K+', label: 'Indian creators', color: '#FF9933' },
              { val: '6',    label: 'Platforms',       color: '#25D366' },
              { val: '7',    label: 'Languages',       color: '#A78BFA' },
              { val: '₹0',  label: 'To start',        color: '#60A5FA' },
            ].map(s => (
              <div key={s.label}>
                <div style={{ fontWeight: 900, fontSize: '1.4rem', letterSpacing: '-0.03em', color: s.color }}>{s.val}</div>
                <div style={{ fontSize: '0.68rem', color: '#55556A', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Social proof */}
          <div style={{ background: '#18181F', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, marginTop: 28 }}>
            <div style={{ display: 'flex' }}>
              {['#FF9933','#8B5CF6','#138808','#1DA1F2'].map((c, i) => (
                <div key={c} style={{ width: 26, height: 26, borderRadius: '50%', border: '2px solid #18181F', background: c, marginLeft: i === 0 ? 0 : -7 }} />
              ))}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#8585A0', lineHeight: 1.5 }}>
              <strong style={{ color: '#F2F2F8' }}>12,000+ Indian creators</strong> growing with Vyral
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <span style={{ fontSize: '0.68rem', color: '#55556A' }}>Works with</span>
          {['#E1306C','#FF0000','#1DA1F2','#0077B5','#1877F2','#25D366'].map(c => (
            <div key={c} style={{ width: 8, height: 8, borderRadius: '50%', background: c, boxShadow: `0 0 5px ${c}` }} />
          ))}
          <span style={{ marginLeft: 'auto', fontSize: '0.68rem', color: '#55556A' }}>vyral.in</span>
        </div>

      </div>
    </div>
  )
}

function Right({ error, loading, status, onGoogle }: {
  error: string | null
  loading: boolean
  status: string
  onGoogle: () => void
}) {
  return (
    <div style={{ width: 460, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 48px', background: '#06060A', overflowY: 'auto' }}>
      <div style={{ width: '100%', maxWidth: 340 }}>

        <h2 style={{ fontWeight: 700, fontSize: '1.75rem', letterSpacing: '-0.02em', color: '#F2F2F8', marginBottom: 6 }}>
          Welcome back
        </h2>
        <p style={{ fontSize: '0.82rem', color: '#8585A0', marginBottom: 28, lineHeight: 1.5 }}>
          Sign in to your Vyral workspace
        </p>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, marginBottom: 16, fontSize: '0.78rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#FCA5A5' }}>
            {error === 'OAuthAccountNotLinked' ? 'Email already linked to another provider.' : 'Sign in failed — please try again.'}
          </div>
        )}

        {/* Google button */}
        <button
          onClick={onGoogle}
          disabled={loading || status === 'loading'}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            padding: '13px 20px', borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.11)', background: '#111118',
            fontSize: '0.88rem', fontWeight: 600, color: '#F2F2F8',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1, transition: 'all 0.2s',
            fontFamily: 'inherit',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = '#FF9933'
            e.currentTarget.style.boxShadow = '0 4px 20px rgba(255,153,51,0.14)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.11)'
            e.currentTarget.style.boxShadow = 'none'
          }}
        >
          {loading
            ? <div style={{ width: 16, height: 16, border: '2px solid rgba(255,153,51,0.3)', borderTopColor: '#FF9933', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
            : <GoogleIcon />
          }
          {loading ? 'Redirecting to Google\u2026' : 'Continue with Google'}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '18px 0' }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
          <span style={{ fontSize: '0.7rem', color: '#55556A', whiteSpace: 'nowrap' }}>more options coming soon</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
        </div>

        <div style={{ padding: '14px 16px', borderRadius: 12, background: '#111118', border: '1px solid rgba(255,255,255,0.06)', fontSize: '0.78rem', color: '#55556A', lineHeight: 1.6 }}>
          <div style={{ color: '#FF9933', fontWeight: 600, marginBottom: 4, fontSize: '0.72rem' }}>
            First time here?
          </div>
          Signing in with Google automatically creates your Vyral workspace and gives you 50 free AI credits.
        </div>

        <p style={{ textAlign: 'center', fontSize: '0.68rem', color: '#55556A', marginTop: 22, lineHeight: 1.7 }}>
          By continuing you agree to our{' '}
          <a href="/terms" style={{ color: '#8585A0', textDecoration: 'none' }}>Terms</a>
          {' '}and{' '}
          <a href="/privacy" style={{ color: '#8585A0', textDecoration: 'none' }}>Privacy Policy</a>.<br />
          Built with love in Bharat
        </p>

      </div>
    </div>
  )
}

function BharatFlag() {
  return (
    <div style={{ width: 32, height: 22, borderRadius: 3, overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 2px 10px rgba(0,0,0,0.5)', flexShrink: 0 }}>
      <div style={{ flex: 1, background: '#FF9933' }} />
      <div style={{ flex: 1, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="#000080" strokeWidth="1.5"/>
          <circle cx="12" cy="12" r="2.5" fill="#000080"/>
          <g stroke="#000080" strokeWidth="0.7">
            <line x1="12" y1="2" x2="12" y2="5.5"/>
            <line x1="12" y1="18.5" x2="12" y2="22"/>
            <line x1="2" y1="12" x2="5.5" y2="12"/>
            <line x1="18.5" y1="12" x2="22" y2="12"/>
            <line x1="4.34" y1="4.34" x2="6.82" y2="6.82"/>
            <line x1="17.18" y1="17.18" x2="19.66" y2="19.66"/>
            <line x1="19.66" y1="4.34" x2="17.18" y2="6.82"/>
            <line x1="6.82" y1="17.18" x2="4.34" y2="19.66"/>
          </g>
        </svg>
      </div>
      <div style={{ flex: 1, background: '#138808' }} />
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.706A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}
