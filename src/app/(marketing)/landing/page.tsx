'use client'
import { useState } from 'react'

export default function LandingPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const [waitlistError, setWaitlistError] = useState('')

  async function handleWaitlist(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setWaitlistError('')
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), source: 'landing' }),
      })
      const data = await res.json()
      if (data.success) {
        setSubmitted(true)
      } else {
        setWaitlistError(data.error ?? 'Could not join the waitlist — try again')
      }
    } catch {
      setWaitlistError('Could not reach the server — try again')
    }
    setLoading(false)
  }

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', background: '#06060A', color: '#F2F2F8', overflowX: 'hidden', WebkitFontSmoothing: 'antialiased' }}>

      {/* Ambient orbs */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -100, left: -80, width: 600, height: 500, borderRadius: '50%', background: '#FF9933', opacity: 0.07, filter: 'blur(140px)' }} />
        <div style={{ position: 'absolute', bottom: -150, right: -80, width: 500, height: 500, borderRadius: '50%', background: '#138808', opacity: 0.06, filter: 'blur(140px)' }} />
        <div style={{ position: 'absolute', top: '40%', left: '30%', width: 300, height: 300, borderRadius: '50%', background: '#6D28D9', opacity: 0.05, filter: 'blur(120px)' }} />
      </div>

      {/* NAV */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 5%', background: 'rgba(6,6,10,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,#FF9933 33.33%,#fff 33.33% 66.66%,#138808 66.66%)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <BharatFlag />
          <span style={{ fontWeight: 900, fontSize: '1.2rem', letterSpacing: '-0.01em' }}>VyralBro</span>
          <span className="landing-flag-badge" style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: '#25D366', background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.2)', borderRadius: 20, padding: '2px 9px' }}>भारत</span>
        </div>
        <div className="landing-nav-links" style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          {['Features', 'Pricing', 'Blog'].map(item => (
            <span key={item} style={{ fontSize: '0.85rem', fontWeight: 500, color: '#8585A0', cursor: 'pointer', transition: 'color 0.2s' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#F2F2F8'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#8585A0'}>
              {item}
            </span>
          ))}
          <a href="/login" className="landing-nav-btn" style={{ padding: '7px 18px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.11)', background: 'transparent', fontSize: '0.82rem', fontWeight: 600, color: '#F2F2F8', cursor: 'pointer', textDecoration: 'none', transition: 'all 0.2s', whiteSpace: 'nowrap' as const }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.3)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.11)'}>
            Sign in
          </a>
          <a href="/login" className="landing-nav-btn" style={{ padding: '7px 18px', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg,#FF9933,#FF6B00)', fontSize: '0.82rem', fontWeight: 700, color: '#fff', cursor: 'pointer', textDecoration: 'none', boxShadow: '0 2px 12px rgba(255,153,51,0.3)', transition: 'all 0.2s', whiteSpace: 'nowrap' as const }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px rgba(255,153,51,0.4)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 12px rgba(255,153,51,0.3)' }}>
            Start free →
          </a>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ position: 'relative', zIndex: 1, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '120px 5% 80px' }}>

        {/* Badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,153,51,0.08)', border: '1px solid rgba(255,153,51,0.2)', borderRadius: 20, padding: '6px 16px', marginBottom: 32, fontSize: '0.78rem', fontWeight: 600, color: '#FF9933' }}>
          <span>🇮🇳</span> Built for Bharat · Now in private beta
        </div>

        {/* Headline */}
        <h1 style={{ fontWeight: 900, fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', lineHeight: 1.05, letterSpacing: '-0.03em', marginBottom: 24, maxWidth: 900 }}>
          Write once.<br />
          <span style={{ color: '#FF9933', fontStyle: 'italic' }}>Reach all of Bharat.</span>
        </h1>

        {/* Subheadline */}
        <p style={{ fontSize: 'clamp(1rem, 2vw, 1.2rem)', color: '#8585A0', lineHeight: 1.7, marginBottom: 48, maxWidth: 620 }}>
          One idea → Instagram, YouTube, LinkedIn, Twitter, Facebook & WhatsApp — AI-adapted in your voice, in your language. In seconds.
        </p>

        {/* Waitlist form */}
        {!submitted ? (
          <form onSubmit={handleWaitlist} className="landing-hero-form" style={{ display: 'flex', gap: 10, marginBottom: 20, width: '100%', maxWidth: 480 }}>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              className="landing-hero-input"
              style={{ flex: 1, minWidth: 0, padding: '13px 18px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.11)', background: '#111118', color: '#F2F2F8', fontSize: '0.92rem', outline: 'none', fontFamily: 'inherit', transition: 'border-color 0.2s' }}
              onFocus={e => e.target.style.borderColor = '#FF9933'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.11)'}
            />
            <button type="submit" disabled={loading}
              style={{ padding: '13px 24px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#FF9933,#FF6B00)', color: '#fff', fontSize: '0.92rem', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' as const, fontFamily: 'inherit', opacity: loading ? 0.8 : 1, boxShadow: '0 2px 16px rgba(255,153,51,0.3)', transition: 'all 0.2s' }}>
              {loading ? 'Joining…' : 'Get early access →'}
            </button>
          </form>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(19,136,8,0.1)', border: '1px solid rgba(19,136,8,0.3)', borderRadius: 12, padding: '14px 24px', marginBottom: 20, fontSize: '0.92rem', color: '#25D366', fontWeight: 600 }}>
            ✓ You&apos;re on the list! We&apos;ll reach out when VyralBro goes live.
          </div>
        )}
        {waitlistError && (
          <p style={{ fontSize: '0.78rem', color: '#F87171', marginTop: -12, marginBottom: 16 }}>{waitlistError}</p>
        )}

        <p style={{ fontSize: '0.75rem', color: '#55556A', marginBottom: 64 }}>Free to start · No credit card · ₹0 setup cost</p>

        {/* Platform dots */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 80 }}>
          <span style={{ fontSize: '0.72rem', color: '#55556A' }}>Works with</span>
          {[
            { color: '#E1306C', name: 'Instagram' },
            { color: '#FF0000', name: 'YouTube' },
            { color: '#1DA1F2', name: 'X/Twitter' },
            { color: '#0077B5', name: 'LinkedIn' },
            { color: '#1877F2', name: 'Facebook' },
            { color: '#25D366', name: 'WhatsApp' },
          ].map(p => (
            <div key={p.name} title={p.name} style={{ width: 10, height: 10, borderRadius: '50%', background: p.color, boxShadow: `0 0 6px ${p.color}` }} />
          ))}
        </div>

        {/* Dashboard preview */}
        <div style={{ width: '100%', maxWidth: 900, background: '#111118', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, overflow: 'hidden', boxShadow: '0 40px 120px rgba(0,0,0,0.6)', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,#FF9933 33.33%,#fff 33.33% 66.66%,#138808 66.66%)' }} />
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#FF5F57' }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#FEBC2E' }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#28C840' }} />
            <span style={{ marginLeft: 12, fontSize: '0.75rem', color: '#55556A' }}>localhost:3000/dashboard</span>
            <span style={{ marginLeft: 'auto', fontSize: '0.65rem', fontWeight: 700, color: '#7A7A90', background: 'rgba(255,255,255,0.06)', borderRadius: 20, padding: '2px 9px' }}>Sample preview</span>
          </div>
          <div className="responsive-grid-4" style={{ padding: '24px', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
            {[
              { label: 'Total Reach', val: '3.09M', delta: '↑ 18.4%', color: '#FF9933' },
              { label: 'Avg. Engagement', val: '6.7%', delta: '↑ 2.1pp', color: '#8B5CF6' },
              { label: 'Posts Published', val: '36', delta: '↑ 12', color: '#25D366' },
              { label: 'Story Views', val: '2.18L', delta: '↑ 41%', color: '#60A5FA' },
            ].map(m => (
              <div key={m.label} style={{ background: '#18181F', borderRadius: 12, padding: '14px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: m.color }} />
                <div style={{ fontSize: '0.65rem', color: '#55556A', marginBottom: 4, textTransform: 'uppercase' as const, letterSpacing: '0.06em', fontWeight: 700 }}>{m.label}</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, letterSpacing: '-0.03em', color: '#F2F2F8' }}>{m.val}</div>
                <div style={{ fontSize: '0.68rem', color: '#34D399', fontWeight: 700, marginTop: 4 }}>{m.delta}</div>
              </div>
            ))}
          </div>
          <div style={{ padding: '0 24px 24px', display: 'flex', gap: 12 }}>
            <div style={{ flex: 1.5, background: '#18181F', borderRadius: 12, padding: 16, height: 120, display: 'flex', alignItems: 'flex-end' }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, width: '100%', height: 80 }}>
                {[35,50,42,68,55,80,72].map((h, i) => (
                  <div key={i} style={{ flex: 1, height: `${h}%`, background: `rgba(255,153,51,${0.3 + i * 0.07})`, borderRadius: '3px 3px 0 0' }} />
                ))}
              </div>
            </div>
            <div style={{ flex: 1, background: '#18181F', borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: '0.65rem', color: '#55556A', marginBottom: 10, fontWeight: 700, textTransform: 'uppercase' as const }}>Platform Share</div>
              {[
                { name: 'YouTube', pct: 72, color: '#FF0000' },
                { name: 'Instagram', pct: 27, color: '#E1306C' },
                { name: 'LinkedIn', pct: 8, color: '#0077B5' },
              ].map(p => (
                <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: '0.65rem', color: p.color, width: 56, flexShrink: 0, fontWeight: 600 }}>{p.name}</span>
                  <div style={{ flex: 1, background: '#12121A', borderRadius: 20, height: 5, overflow: 'hidden' }}>
                    <div style={{ width: `${p.pct}%`, height: '100%', background: p.color, borderRadius: 20 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section style={{ position: 'relative', zIndex: 1, padding: '100px 5%', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: '#FF9933', marginBottom: 16 }}>Why VyralBro</div>
          <h2 style={{ fontWeight: 900, fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 16 }}>
            Built different.<br /><span style={{ color: '#FF9933' }}>Built for Bharat.</span>
          </h2>
          <p style={{ fontSize: '1rem', color: '#8585A0', lineHeight: 1.7, maxWidth: 520, margin: '0 auto' }}>
            Every other social media tool was built for the US market. VyralBro is built from the ground up for Indian creators.
          </p>
        </div>

        <div className="responsive-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20 }}>
          {[
            {
              icon: '✦',
              title: 'AI adapted for India',
              desc: 'Write in English, publish in Hindi, Tamil, Kannada, Telugu, Bengali or Marathi. Our AI understands ₹, lakh, crore, and Indian cultural context.',
              color: '#FF9933',
            },
            {
              icon: '🚀',
              title: 'One post, 6 platforms',
              desc: 'Write your idea once. VyralBro adapts the length, tone, format, and hashtags for Instagram, YouTube, LinkedIn, Twitter, Facebook, and WhatsApp automatically.',
              color: '#8B5CF6',
            },
            {
              icon: '📊',
              title: 'Analytics in lakh & crore',
              desc: 'See your reach in 1.2L, not 120,000. Optimal posting times in IST. City-level breakdown — Mumbai, Delhi, Bengaluru, Hyderabad.',
              color: '#60A5FA',
            },
            {
              icon: '💬',
              title: 'WhatsApp as a channel',
              desc: 'WhatsApp Broadcast is India\'s highest open-rate channel. VyralBro treats it as a first-class publishing platform, not an afterthought.',
              color: '#25D366',
            },
            {
              icon: '💳',
              title: 'Pay in ₹, not $',
              desc: 'Razorpay native. UPI, cards, net banking — all supported. No conversion rate surprises. Plans start at ₹999/month.',
              color: '#E1306C',
            },
            {
              icon: '⚡',
              title: 'Insights that actually help',
              desc: 'AI-powered weekly insights — best time to post in IST, which content type your Indian audience loves, city-level performance breakdown.',
              color: '#FBBF24',
            },
          ].map(f => (
            <div key={f.title} style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 18, padding: '28px', transition: 'all 0.2s', cursor: 'default' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.12)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLElement).style.transform = '' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: 16, color: f.color }}>{f.icon}</div>
              <div style={{ fontWeight: 700, fontSize: '1rem', letterSpacing: '-0.01em', marginBottom: 10, color: '#F2F2F8' }}>{f.title}</div>
              <div style={{ fontSize: '0.85rem', color: '#8585A0', lineHeight: 1.7 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ position: 'relative', zIndex: 1, padding: '80px 5%', background: 'rgba(255,255,255,0.015)', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: '#FF9933', marginBottom: 16 }}>How it works</div>
          <h2 style={{ fontWeight: 900, fontSize: 'clamp(1.8rem, 3vw, 2.4rem)', letterSpacing: '-0.03em', marginBottom: 56 }}>Three steps. That&apos;s it.</h2>
          <div className="responsive-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 40 }}>
            {[
              { num: '01', title: 'Write your idea', desc: 'Paste your raw idea, story, or announcement. Just your words — no formatting needed.' },
              { num: '02', title: 'AI adapts it', desc: 'Claude AI rewrites it for each platform — right length, right tone, right hashtags, right language.' },
              { num: '03', title: 'Publish everywhere', desc: 'Schedule or post now to all 6 platforms in one click. Track performance in your dashboard.' },
            ].map((step, i) => (
              <div key={step.num} style={{ position: 'relative' }}>
                {i < 2 && <div style={{ position: 'absolute', top: 24, left: '60%', right: '-40%', height: 1, background: 'linear-gradient(90deg, rgba(255,153,51,0.4), transparent)', zIndex: 0 }} />}
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,153,51,0.1)', border: '1px solid rgba(255,153,51,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '0.78rem', fontWeight: 800, color: '#FF9933' }}>{step.num}</div>
                  <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 10, color: '#F2F2F8' }}>{step.title}</div>
                  <div style={{ fontSize: '0.85rem', color: '#8585A0', lineHeight: 1.7 }}>{step.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHY WE'RE BUILDING THIS — honest founder framing, no invented testimonials */}
      <section style={{ position: 'relative', zIndex: 1, padding: '100px 5%', maxWidth: 900, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: '#FF9933', marginBottom: 16 }}>Why VyralBro</div>
          <h2 style={{ fontWeight: 900, fontSize: 'clamp(1.8rem, 3vw, 2.4rem)', letterSpacing: '-0.03em', marginBottom: 20 }}>Built by creators, for Bharat 🇮🇳</h2>
          <p style={{ fontSize: '0.92rem', color: '#8585A0', lineHeight: 1.8, maxWidth: 640, margin: '0 auto' }}>
            Every major social tool treats India as an afterthought — US-first pricing, no regional languages, WhatsApp ignored entirely.
            We&apos;re building VyralBro from scratch for the way Indian creators actually work. We&apos;re in private beta right now —
            join the waitlist and you&apos;ll be one of the first to shape what we build next.
          </p>
        </div>
      </section>

      {/* PRICING */}
      <section style={{ position: 'relative', zIndex: 1, padding: '80px 5%', background: 'rgba(255,255,255,0.015)', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: '#FF9933', marginBottom: 16 }}>Pricing</div>
            <h2 style={{ fontWeight: 900, fontSize: 'clamp(1.8rem, 3vw, 2.4rem)', letterSpacing: '-0.03em', marginBottom: 12 }}>Priced for India</h2>
            <p style={{ fontSize: '0.9rem', color: '#8585A0' }}>Pay in ₹. Cancel anytime. No hidden charges.</p>
          </div>
          <div className="responsive-grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
            {[
              { name: 'Free', price: '₹0', period: 'forever', posts: '5 posts/mo', credits: '25 AI credits', platforms: '1 platform', cta: 'Start free', highlight: false },
              { name: 'Creator', price: '₹999', period: '/month', posts: '99 posts/mo', credits: '400 AI credits', platforms: '3 platforms', cta: 'Get Creator', highlight: false },
              { name: 'Pro', price: '₹2,999', period: '/month', posts: '500 posts/mo', credits: '2,000 AI credits', platforms: '5 platforms', cta: 'Get Pro', highlight: true },
              { name: 'Top1% Club', price: '₹6,999', period: '/month', posts: 'Unlimited', credits: '5,000 AI credits', platforms: '6 platforms', cta: 'Join Top1% Club', highlight: false },
            ].map(p => (
              <div key={p.name} style={{ background: p.highlight ? 'rgba(255,153,51,0.06)' : '#111118', border: `1px solid ${p.highlight ? 'rgba(255,153,51,0.3)' : 'rgba(255,255,255,0.06)'}`, borderRadius: 18, padding: '28px 24px', position: 'relative', transition: 'all 0.2s' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = ''}>
                {p.highlight && <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg,#FF9933,#FF6B00)', color: '#fff', fontSize: '0.65rem', fontWeight: 700, padding: '3px 12px', borderRadius: 20, whiteSpace: 'nowrap' as const }}>Most Popular</div>}
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: p.highlight ? '#FF9933' : '#F2F2F8', marginBottom: 12 }}>{p.name}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 20 }}>
                  <span style={{ fontWeight: 900, fontSize: '1.8rem', letterSpacing: '-0.03em', color: '#F2F2F8' }}>{p.price}</span>
                  <span style={{ fontSize: '0.75rem', color: '#55556A' }}>{p.period}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
                  {[p.posts, p.credits, p.platforms].map(feature => (
                    <div key={feature} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: '#8585A0' }}>
                      <span style={{ color: '#25D366', flexShrink: 0 }}>✓</span> {feature}
                    </div>
                  ))}
                </div>
                <a href="/login" style={{ display: 'block', textAlign: 'center', padding: '10px', borderRadius: 10, background: p.highlight ? 'linear-gradient(135deg,#FF9933,#FF6B00)' : 'transparent', border: p.highlight ? 'none' : '1px solid rgba(255,255,255,0.11)', fontSize: '0.82rem', fontWeight: 700, color: p.highlight ? '#fff' : '#F2F2F8', cursor: 'pointer', textDecoration: 'none', transition: 'all 0.2s', boxShadow: p.highlight ? '0 2px 12px rgba(255,153,51,0.25)' : 'none' }}>
                  {p.cta}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section style={{ position: 'relative', zIndex: 1, padding: '120px 5%', textAlign: 'center' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <div style={{ fontSize: '3rem', marginBottom: 24 }}>🇮🇳</div>
          <h2 style={{ fontWeight: 900, fontSize: 'clamp(2rem, 4vw, 3rem)', letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 20 }}>
            India&apos;s Creator OS<br />is here.
          </h2>
          <p style={{ fontSize: '1rem', color: '#8585A0', lineHeight: 1.7, marginBottom: 40 }}>
            Be one of the first Indian creators to try it. Free to start. No credit card required.
          </p>
          {!submitted ? (
            <form onSubmit={handleWaitlist} style={{ display: 'flex', gap: 10, maxWidth: 440, margin: '0 auto 16px' }}>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" required
                style={{ flex: 1, padding: '13px 18px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.11)', background: '#111118', color: '#F2F2F8', fontSize: '0.92rem', outline: 'none', fontFamily: 'inherit' }}
                onFocus={e => e.target.style.borderColor = '#FF9933'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.11)'} />
              <button type="submit" style={{ padding: '13px 24px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#FF9933,#FF6B00)', color: '#fff', fontSize: '0.92rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 2px 16px rgba(255,153,51,0.3)' }}>
                Join waitlist →
              </button>
            </form>
          ) : (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: 'rgba(19,136,8,0.1)', border: '1px solid rgba(19,136,8,0.3)', borderRadius: 12, padding: '14px 24px', marginBottom: 16, fontSize: '0.92rem', color: '#25D366', fontWeight: 600 }}>
              ✓ You&apos;re on the list!
            </div>
          )}
          {waitlistError && (
            <p style={{ fontSize: '0.78rem', color: '#F87171', marginBottom: 16 }}>{waitlistError}</p>
          )}
          <p style={{ fontSize: '0.72rem', color: '#55556A' }}>Built with ❤️ in Bharat · vyralbro.in</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="landing-footer" style={{ position: 'relative', zIndex: 1, borderTop: '1px solid rgba(255,255,255,0.06)', padding: '32px 5%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <BharatFlag />
          <span style={{ fontWeight: 900, fontSize: '1rem' }}>VyralBro</span>
          <span style={{ fontSize: '0.72rem', color: '#55556A' }}>· India&apos;s Creator OS</span>
        </div>
        <div style={{ display: 'flex', gap: 24 }}>
          {[{ label: 'Privacy', href: '/privacy' }, { label: 'Terms', href: '/terms' }, { label: 'Contact', href: 'mailto:rj@rootn.ai' }].map(item => (
            <a key={item.label} href={item.href} style={{ fontSize: '0.78rem', color: '#55556A', textDecoration: 'none', transition: 'color 0.2s' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#F2F2F8'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#55556A'}>
              {item.label}
            </a>
          ))}
        </div>
        <div style={{ fontSize: '0.72rem', color: '#55556A' }}>© 2025 VyralBro · Made in Bharat 🇮🇳</div>
      </footer>
    </div>
  )
}

function BharatFlag() {
  return (
    <svg width="30" height="21" viewBox="0 0 30 21" style={{ borderRadius: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.5)', flexShrink: 0, display: 'block' }}>
      {/* Saffron — TOP stripe */}
      <rect x="0" y="0" width="30" height="7" fill="#FF9933" />
      {/* White — MIDDLE stripe */}
      <rect x="0" y="7" width="30" height="7" fill="#FFFFFF" />
      {/* Green — BOTTOM stripe */}
      <rect x="0" y="14" width="30" height="7" fill="#138808" />
      {/* Ashoka Chakra */}
      <circle cx="15" cy="10.5" r="3" fill="none" stroke="#000080" strokeWidth="0.6" />
      <circle cx="15" cy="10.5" r="0.8" fill="#000080" />
      <g stroke="#000080" strokeWidth="0.4">
        <line x1="15" y1="7.5" x2="15" y2="8.8" />
        <line x1="15" y1="12.2" x2="15" y2="13.5" />
        <line x1="12" y1="10.5" x2="13.3" y2="10.5" />
        <line x1="16.7" y1="10.5" x2="18" y2="10.5" />
        <line x1="12.88" y1="8.38" x2="13.8" y2="9.3" />
        <line x1="16.2" y1="11.7" x2="17.12" y2="12.62" />
        <line x1="17.12" y1="8.38" x2="16.2" y2="9.3" />
        <line x1="13.8" y1="11.7" x2="12.88" y2="12.62" />
        <line x1="15" y1="7.5" x2="15.6" y2="8.75" />
        <line x1="14.4" y1="12.25" x2="15" y2="13.5" />
        <line x1="12" y1="10.5" x2="13.3" y2="11.1" />
        <line x1="16.7" y1="9.9" x2="18" y2="10.5" />
        <line x1="15" y1="7.5" x2="14.4" y2="8.75" />
        <line x1="15.6" y1="12.25" x2="15" y2="13.5" />
        <line x1="12" y1="10.5" x2="13.3" y2="9.9" />
        <line x1="16.7" y1="11.1" x2="18" y2="10.5" />
      </g>
    </svg>
  )
}
