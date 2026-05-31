'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

const PC: Record<string, string> = {
  instagram: '#E1306C', twitter: '#1DA1F2', linkedin: '#0077B5',
  youtube: '#FF0000', facebook: '#1877F2', whatsapp: '#25D366',
}
const PL: Record<string, string> = {
  instagram: 'Instagram', twitter: 'X / Twitter', linkedin: 'LinkedIn',
  youtube: 'YouTube', facebook: 'Facebook', whatsapp: 'WhatsApp',
}
const PF: Record<string, string> = {
  instagram: 'Reels caption · hashtags',
  twitter: 'Thread (1/N)',
  linkedin: 'Professional post',
  youtube: 'Shorts description',
  facebook: 'Page post',
  whatsapp: 'Broadcast message',
}
const PM: Record<string, number> = {
  instagram: 2200, twitter: 280, linkedin: 3000,
  youtube: 5000, facebook: 63206, whatsapp: 1000,
}

interface PlatformOutput {
  text: string
  hashtags: string[]
  tip: string
}

export default function StudioPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [raw, setRaw] = useState('Sharing 5 lessons from building a profitable SaaS from ₹0 in India — bootstrapped, no VC, profitable in 6 months. Indian B2B is different. Pricing, trust, first customers — here\'s what nobody tells you.')
  const [tone, setTone] = useState('Authentic')
  const [format, setFormat] = useState('Listicle')
  const [language, setLanguage] = useState('🇮🇳 English')
  const [platforms, setPlatforms] = useState(['instagram', 'twitter', 'linkedin', 'youtube', 'facebook', 'whatsapp'])
  const [schedule, setSchedule] = useState('Post now')
  const [loading, setLoading] = useState(false)
  const [previews, setPreviews] = useState<Record<string, PlatformOutput>>({})
  const [saved, setSaved] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [toast, setToast] = useState('')

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const togglePlatform = (p: string) => {
    setPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])
  }

  const generate = async () => {
    if (!raw.trim()) { showToast('Write your idea first'); return }
    if (platforms.length === 0) { showToast('Pick at least one platform'); return }
    setLoading(true)
    setPreviews({})
    setSaved(false)

    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawContent: raw,
          tone,
          format,
          language,
          platforms: platforms.map(p => p.toUpperCase()),
        }),
      })
      const data = await res.json()
      if (data.success) {
        const gen = data.data.generated
        const mapped: Record<string, PlatformOutput> = {}
        platforms.forEach(p => {
          if (gen[p.toUpperCase()]) mapped[p] = gen[p.toUpperCase()]
        })
        setPreviews(mapped)
        showToast(`✦ Adapted for ${platforms.length} platforms · ${data.data.creditsRemaining} credits left`)
      } else {
        showToast(data.error ?? 'Generation failed')
      }
    } catch (e) {
      showToast('Error connecting to AI — check your API key')
    }
    setLoading(false)
  }

  const saveDraft = async () => {
    if (Object.keys(previews).length === 0) { showToast('Generate content first'); return }
    showToast('Saving draft…')
    await new Promise(r => setTimeout(r, 800))
    setSaved(true)
    showToast('Draft saved ✓')
  }

  const publishAll = async () => {
    if (Object.keys(previews).length === 0) { showToast('Generate content first'); return }
    setPublishing(true)
    await new Promise(r => setTimeout(r, 1200))
    setPublishing(false)
    showToast(`🚀 Queued for ${platforms.length} platforms`)
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#0A0A0F', fontFamily: 'system-ui, sans-serif', color: '#F0F0F8', WebkitFontSmoothing: 'antialiased' }}>

      {/* ── SIDEBAR (mini) ── */}
      <aside style={{ width: 220, flexShrink: 0, background: '#12121A', borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <BharatFlag />
            <span style={{ fontWeight: 900, fontSize: '1.1rem' }}>Vy<span style={{ color: '#FF9933' }}>ral</span></span>
            <span style={{ fontSize: '0.58rem', fontWeight: 700, background: 'linear-gradient(135deg,#FF9933,#FF6B00)', color: '#fff', padding: '2px 6px', borderRadius: 4 }}>Pro</span>
          </div>
        </div>
        <div style={{ padding: '8px 0', flex: 1 }}>
          {[
            { icon: '⊞', label: 'Dashboard', path: '/dashboard' },
            { icon: '✍️', label: 'Post Content', active: true },
            { icon: '📅', label: 'Scheduler', path: '/dashboard' },
            { icon: '📚', label: 'Content Library', path: '/dashboard' },
            { icon: '📊', label: 'Analytics', path: '/dashboard' },
          ].map(item => (
            <div key={item.label} onClick={() => item.path && router.push(item.path)}
              style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 10px', margin: '1px 6px', borderRadius: 9, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 500, color: item.active ? '#FF9933' : '#7A7A90', background: item.active ? 'rgba(255,153,51,0.1)' : 'transparent', transition: 'all 0.15s' }}
              onMouseEnter={e => { if (!item.active) { (e.currentTarget as HTMLElement).style.background = '#18181F'; (e.currentTarget as HTMLElement).style.color = '#F0F0F8' } }}
              onMouseLeave={e => { if (!item.active) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#7A7A90' } }}>
              <span style={{ fontSize: '0.9rem', width: 16, textAlign: 'center' as const }}>{item.icon}</span>
              {item.label}
            </div>
          ))}
        </div>
        <div style={{ padding: '12px 12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,#FF9933,#138808)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800, color: '#fff', flexShrink: 0 }}>
            {session?.user?.name?.charAt(0) ?? 'R'}
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{session?.user?.name ?? 'Creator'}</div>
            <div style={{ fontSize: '0.65rem', color: '#5A5A72' }}>Owner</div>
          </div>
        </div>
      </aside>

      {/* ── EDITOR + PREVIEW ── */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 420px', overflow: 'hidden' }}>

        {/* LEFT: Editor */}
        <div style={{ borderRight: '1px solid rgba(255,255,255,0.06)', overflowY: 'auto', padding: '2rem 2rem 2rem 2.5rem', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

          {/* Header */}
          <div style={{ paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: '#FF9933', marginBottom: 6 }}>✦ Creator Studio</div>
            <div style={{ fontWeight: 900, fontSize: '1.6rem', letterSpacing: '-0.02em', lineHeight: 1.2 }}>Write once.<br /><span style={{ color: '#FF9933', fontStyle: 'italic' }}>Reach Bharat.</span></div>
            <div style={{ fontSize: '0.82rem', color: '#7A7A90', marginTop: 5 }}>One idea → 6 platforms, AI-adapted in your voice & language.</div>
          </div>

          {/* Content idea */}
          <div>
            <FieldLabel num="01" label="Your idea or draft" />
            <textarea
              value={raw}
              onChange={e => setRaw(e.target.value)}
              placeholder="Share your story, insight, or announcement… write it raw, we'll shape it for every platform."
              style={{ width: '100%', minHeight: 155, background: '#18181F', border: '1px solid rgba(255,255,255,0.11)', borderRadius: 14, padding: '1rem 1.1rem', color: '#F0F0F8', fontFamily: 'system-ui', fontSize: '0.92rem', lineHeight: 1.65, resize: 'vertical', outline: 'none', transition: 'border-color 0.2s' }}
              onFocus={e => e.target.style.borderColor = '#FF9933'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.11)'}
            />
            <div style={{ fontSize: '0.68rem', color: '#5A5A72', marginTop: 4, textAlign: 'right' as const }}>{raw.length} chars</div>
          </div>

          {/* Tone */}
          <div>
            <FieldLabel num="02" label="Tone" />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
              {['Authentic', 'Motivational', 'Educational', 'Controversial', 'Storytelling'].map(t => (
                <Pill key={t} label={t} active={tone === t} onClick={() => setTone(t)} />
              ))}
            </div>
          </div>

          {/* Format */}
          <div>
            <FieldLabel num="03" label="Format" />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
              {['Listicle', 'Thread', 'Story arc', 'Hook + Body', 'Carousel copy'].map(f => (
                <Pill key={f} label={f} active={format === f} onClick={() => setFormat(f)} />
              ))}
            </div>
          </div>

          {/* Language */}
          <div>
            <FieldLabel num="04" label="Language" />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
              {['🇮🇳 English', 'हि Hindi', 'த Tamil', 'ಕ Kannada', 'తె Telugu', 'বাং Bengali', 'मर Marathi'].map(l => (
                <Pill key={l} label={l} active={language === l} onClick={() => setLanguage(l)} color="green" />
              ))}
            </div>
          </div>

          {/* Platforms */}
          <div>
            <FieldLabel num="05" label="Platforms" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
              {Object.entries(PL).map(([key, name]) => {
                const on = platforms.includes(key)
                return (
                  <div key={key} onClick={() => togglePlatform(key)}
                    style={{ border: `1.5px solid ${on ? PC[key] : 'rgba(255,255,255,0.08)'}`, borderRadius: 12, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', background: on ? '#18181F' : '#12121A', transition: 'all 0.2s', userSelect: 'none' as const }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: PC[key], boxShadow: on ? `0 0 6px ${PC[key]}` : 'none', flexShrink: 0, transition: 'box-shadow 0.2s' }} />
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: on ? PC[key] : '#7A7A90' }}>{name}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Schedule */}
          <div>
            <FieldLabel num="06" label="Schedule" />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
              {['🚀 Post now', '✦ AI best time', '📅 Custom'].map(s => (
                <Pill key={s} label={s} active={schedule === s} onClick={() => setSchedule(s)} />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' as const }}>
            <button onClick={generate} disabled={loading}
              style={{ position: 'relative', padding: '11px 26px', borderRadius: 12, border: 'none', background: loading ? '#333' : 'linear-gradient(135deg,#FF9933,#FF6B00)', color: '#fff', fontFamily: 'system-ui', fontSize: '0.88rem', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 8, boxShadow: loading ? 'none' : '0 2px 14px rgba(255,153,51,0.25)' }}
              onMouseEnter={e => { if (!loading) { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 24px rgba(255,153,51,0.35)' } }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = loading ? 'none' : '0 2px 14px rgba(255,153,51,0.25)' }}>
              {loading
                ? <><Spinner /> Adapting for Bharat…</>
                : <>✦ Generate with AI</>}
            </button>

            {Object.keys(previews).length > 0 && (
              <>
                <button onClick={saveDraft}
                  style={{ padding: '11px 22px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.11)', background: '#18181F', color: saved ? '#34D399' : '#F0F0F8', fontFamily: 'system-ui', fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>
                  {saved ? '✓ Saved' : '💾 Save Draft'}
                </button>
                <button onClick={publishAll} disabled={publishing}
                  style={{ padding: '11px 22px', borderRadius: 12, border: '1px solid rgba(19,136,8,0.4)', background: 'rgba(19,136,8,0.08)', color: '#25D366', fontFamily: 'system-ui', fontSize: '0.88rem', fontWeight: 600, cursor: publishing ? 'not-allowed' : 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 8 }}>
                  {publishing ? <><Spinner color="#25D366" /> Publishing…</> : '🚀 Publish All'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* RIGHT: Previews */}
        <div style={{ background: '#12121A', borderLeft: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#7A7A90' }}>Platform Previews</div>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: 'rgba(255,153,51,0.1)', border: '1px solid rgba(255,153,51,0.25)', color: '#FF9933', letterSpacing: '0.06em' }}>✦ AI Adapted</div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {loading && platforms.map((p, i) => (
              <div key={p} style={{ background: '#18181F', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '12px 14px', animationDelay: `${i * 0.08}s` }}>
                <Shimmer width="40%" height={12} mb={12} />
                <Shimmer width="95%" height={11} mb={8} />
                <Shimmer width="80%" height={11} mb={8} />
                <Shimmer width="60%" height={11} mb={0} />
              </div>
            ))}

            {!loading && Object.keys(previews).length === 0 && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: '#3A3A52', textAlign: 'center' as const, padding: '2rem' }}>
                <div style={{ fontSize: '2.5rem' }}>✦</div>
                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#5A5A72' }}>Your previews will appear here</div>
                <div style={{ fontSize: '0.75rem', color: '#3A3A52' }}>Write your idea and click Generate</div>
              </div>
            )}

            {!loading && platforms.map(p => {
              const d = previews[p]
              if (!d) return null
              const lim = PM[p]
              const len = d.text?.length ?? 0
              const pct = Math.min(100, Math.round(len / lim * 100))
              return (
                <div key={p} style={{ background: '#18181F', border: `1px solid rgba(255,255,255,0.06)`, borderRadius: 16, overflow: 'hidden', transition: 'border-color 0.2s', animation: 'fadeUp 0.4s ease both' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.12)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)'}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', fontWeight: 700 }}>
                      <div style={{ width: 22, height: 22, borderRadius: 6, background: `${PC[p]}18`, color: PC[p], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 900 }}>●</div>
                      <span style={{ color: PC[p] }}>{PL[p]}</span>
                      <span style={{ fontSize: '0.65rem', color: '#5A5A72', fontWeight: 400 }}>{PF[p]}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span style={{ fontSize: '0.65rem', color: '#5A5A72' }}>{len}/{lim}</span>
                      <button onClick={() => { navigator.clipboard.writeText((d.text ?? '') + ' ' + (d.hashtags ?? []).join(' ')) }}
                        style={{ width: 28, height: 28, borderRadius: 7, background: '#12121A', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '0.72rem', color: '#7A7A90', fontFamily: 'system-ui' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#FF9933'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,153,51,0.3)' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#7A7A90'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)' }}>
                        ⎘
                      </button>
                    </div>
                  </div>
                  <div style={{ padding: '12px 14px' }}>
                    <div style={{ fontSize: '0.82rem', lineHeight: 1.65, color: '#F0F0F8', whiteSpace: 'pre-wrap', maxHeight: 140, overflow: 'hidden', position: 'relative' }}>
                      {d.text}
                    </div>
                    {d.hashtags?.length > 0 && (
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' as const, marginTop: 8 }}>
                        {d.hashtags.map((tag: string) => (
                          <span key={tag} style={{ fontSize: '0.65rem', fontWeight: 600, padding: '2px 7px', borderRadius: 20, background: `${PC[p]}18`, color: PC[p] }}>{tag}</span>
                        ))}
                      </div>
                    )}
                    <div style={{ marginTop: 10, background: '#12121A', borderRadius: 20, height: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: pct > 90 ? '#F87171' : PC[p], borderRadius: 20, transition: 'width 0.6s ease' }} />
                    </div>
                    {d.tip && (
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 5, marginTop: 8, fontSize: '0.7rem', color: '#7A7A90' }}>
                        <span style={{ color: '#FF9933', flexShrink: 0 }}>✦</span>
                        <span>{d.tip}</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: '#18181F', border: '1px solid rgba(255,255,255,0.11)', borderRadius: 12, padding: '12px 16px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', zIndex: 1000, maxWidth: 320, borderLeft: '3px solid #FF9933', animation: 'fadeUp 0.3s ease' }}>
          ✦ {toast}
        </div>
      )}

      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:none; } }
        @keyframes shimmer { to { background-position: -300% 0; } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

function FieldLabel({ num, label }: { num: string; label: string }) {
  return (
    <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#7A7A90', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ color: '#FF9933' }}>{num}</span> {label}
    </div>
  )
}

function Pill({ label, active, onClick, color = 'saffron' }: { label: string; active: boolean; onClick: () => void; color?: string }) {
  const activeStyle = color === 'green'
    ? { background: 'rgba(19,136,8,0.12)', borderColor: 'rgba(19,136,8,0.35)', color: '#25D366' }
    : { background: 'rgba(255,153,51,0.1)', borderColor: 'rgba(255,153,51,0.4)', color: '#FF9933' }
  return (
    <div onClick={onClick} style={{ padding: '7px 14px', borderRadius: 20, border: `1px solid ${active ? 'transparent' : 'rgba(255,255,255,0.11)'}`, background: active ? activeStyle.background : '#18181F', color: active ? activeStyle.color : '#7A7A90', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.18s', userSelect: 'none' as const, ...(active ? { borderColor: activeStyle.borderColor } : {}) }}
      onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.color = '#F0F0F8'; (e.currentTarget as HTMLElement).style.background = '#1E1E28' } }}
      onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.color = '#7A7A90'; (e.currentTarget as HTMLElement).style.background = '#18181F' } }}>
      {label}
    </div>
  )
}

function Shimmer({ width, height, mb }: { width: string; height: number; mb: number }) {
  return (
    <div style={{ width, height, borderRadius: 6, marginBottom: mb, background: 'linear-gradient(90deg,#18181F 0%,#1E1E28 50%,#18181F 100%)', backgroundSize: '300% 100%', animation: 'shimmer 1.4s ease infinite' }} />
  )
}

function Spinner({ color = '#fff' }: { color?: string }) {
  return (
    <div style={{ width: 14, height: 14, border: `2px solid ${color}33`, borderTopColor: color, borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
  )
}

function BharatFlag() {
  return (
    <div style={{ width: 28, height: 20, borderRadius: 3, overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 2px 8px rgba(0,0,0,0.5)', flexShrink: 0 }}>
      <div style={{ flex: 1, background: '#FF9933' }} />
      <div style={{ flex: 1, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="#000080" strokeWidth="1.5" />
          <circle cx="12" cy="12" r="2.5" fill="#000080" />
          <g stroke="#000080" strokeWidth="0.8">
            <line x1="12" y1="2" x2="12" y2="5.5" /><line x1="12" y1="18.5" x2="12" y2="22" />
            <line x1="2" y1="12" x2="5.5" y2="12" /><line x1="18.5" y1="12" x2="22" y2="12" />
            <line x1="4.34" y1="4.34" x2="6.82" y2="6.82" /><line x1="17.18" y1="17.18" x2="19.66" y2="19.66" />
            <line x1="19.66" y1="4.34" x2="17.18" y2="6.82" /><line x1="6.82" y1="17.18" x2="4.34" y2="19.66" />
          </g>
        </svg>
      </div>
      <div style={{ flex: 1, background: '#138808' }} />
    </div>
  )
}
