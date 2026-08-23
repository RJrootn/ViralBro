'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import UsageMeter from '@/components/billing/UsageMeter'
import LimitBanner from '@/components/billing/LimitBanner'
import { useUsage } from '@/lib/hooks/useUsage'

const LANGUAGES = ['भारत', 'ভারত', 'భారత్', 'ಭಾರತ', 'भारत', 'বাংলা', 'India']

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

// The language pills show a display label ("🇮🇳 English", "हि Hindi") but
// /lib/ai/generate.ts only special-cases the literal code 'en' for its
// English-purity instructions — anything else is passed straight through as
// "write entirely in {language}". Map the label to the code/name the
// backend actually expects.
const LANG_CODE: Record<string, string> = {
  '🇮🇳 English': 'en',
  'हि Hindi': 'Hindi',
  'த Tamil': 'Tamil',
  'ಕ Kannada': 'Kannada',
  'తె Telugu': 'Telugu',
  'বাং Bengali': 'Bengali',
  'मर Marathi': 'Marathi',
}

interface PlatformOutput {
  text: string
  hashtags: string[]
  tip: string
}

interface ConnectedAccount {
  id: string
  platform: string // uppercase, e.g. 'INSTAGRAM'
}

interface UploadedMedia {
  url:         string
  contentType: string
  name:        string
}

const MEDIA_TYPE_OPTIONS = [
  { key: 'IMAGE',    label: '🖼️ Image',   hint: 'Feed post' },
  { key: 'VIDEO',    label: '🎬 Video',   hint: 'Feed video' },
  { key: 'REEL',     label: '🎞️ Reel',    hint: 'Short-form video' },
  { key: 'STORY',    label: '⏱️ Story',   hint: '24h, no caption on IG' },
  { key: 'CAROUSEL', label: '🖼️🖼️ Carousel', hint: '2+ images/videos' },
] as const

export default function StudioPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const { data: usageData } = useUsage()
  const isBrandedPlan = usageData?.plan === 'FREE' || usageData?.plan === 'CREATOR'
  const [raw, setRaw] = useState('Sharing 5 lessons from building a profitable SaaS from ₹0 in India — bootstrapped, no VC, profitable in 6 months. Indian B2B is different. Pricing, trust, first customers — here\'s what nobody tells you.')
  const [tone, setTone] = useState('Authentic')
  const [format, setFormat] = useState('Listicle')
  // Multiple languages can be selected at once — generate() fires one
  // /api/ai/generate call per selected language (each independently and
  // atomically credit-checked server-side, so this can't double-spend or
  // under-charge), and previews are kept per-language so nothing overwrites
  // anything else. activeLanguage controls which language's set of
  // platform previews is currently shown/edited/published — see
  // currentPreviews below.
  const [languages, setLanguages] = useState<string[]>(['🇮🇳 English'])
  const [activeLanguage, setActiveLanguage] = useState('🇮🇳 English')
  const [platforms, setPlatforms] = useState(['instagram', 'twitter', 'linkedin', 'youtube', 'facebook', 'whatsapp'])
  const [schedule, setSchedule] = useState('Post now')
  const [loading, setLoading] = useState(false)
  // Keyed by language, then platform — was a flat Record<platform, ...>
  // when only one language could be picked at a time.
  const [previews, setPreviews] = useState<Record<string, Record<string, PlatformOutput>>>({})
  const [saved, setSaved] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [toast, setToast] = useState('')
  // Set when the AI-generate or publish call comes back 402 (plan limit
  // reached) — rendered as a persistent banner with an Upgrade link rather
  // than the usual 3-second toast, since "you're blocked, here's the fix"
  // deserves more than a message that vanishes before anyone can act on it.
  const [limitBanner, setLimitBanner] = useState('')
  const [langIdx, setLangIdx] = useState(0)
  // Live "N/total languages done" while a multi-language generate is in
  // flight — null when idle. Shown in the Generate button so a multi-
  // language run doesn't look frozen just because it's the slower of
  // several requests still working through the queue.
  const [genProgress, setGenProgress] = useState<{ done: number; total: number } | null>(null)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([])
  const [media, setMedia] = useState<UploadedMedia[]>([])
  const [mediaType, setMediaType] = useState<typeof MEDIA_TYPE_OPTIONS[number]['key']>('IMAGE')
  const [uploading, setUploading] = useState(false)
  const [uploadPct, setUploadPct] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setLangIdx(i => (i + 1) % LANGUAGES.length)
    }, 1800)
    return () => clearInterval(interval)
  }, [])

  // Which platforms actually have a connected social account — Save Draft
  // and Publish All can only act on these (the API requires a socialAccountId
  // per platform). Content generation itself doesn't need a connection.
  useEffect(() => {
    fetch('/api/platforms/connect')
      .then(res => res.json())
      .then(data => { if (data.success) setAccounts(data.data.accounts) })
      .catch(() => {})
  }, [])

  const accountFor = (platformKey: string) =>
    accounts.find(a => a.platform === platformKey.toUpperCase())

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const togglePlatform = (p: string) => {
    setPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])
  }

  const toggleLanguage = (l: string) => {
    setLanguages(prev => prev.includes(l) ? prev.filter(x => x !== l) : [...prev, l])
  }

  // The platform previews currently shown/edited/published — scoped to
  // whichever language tab is active. Everything below that used to read
  // the old flat `previews` (edit textarea, publish payload, empty-state
  // checks) now reads this instead.
  const currentPreviews = previews[activeLanguage] ?? {}

  // Upload flow: ask our API for a presigned S3 PUT URL, then PUT the file
  // bytes straight to S3 from the browser (never through our own server —
  // Netlify functions cap request bodies well below Reels-length video).
  // XHR (not fetch) so we get upload-progress events for the progress bar.
  const uploadFile = async (file: File) => {
    setUploading(true)
    setUploadPct(0)
    try {
      const presignRes = await fetch('/api/media/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, contentType: file.type }),
      })
      const presignData = await presignRes.json()
      if (!presignData.success) {
        showToast(presignData.error ?? 'Could not prepare upload')
        return
      }
      const { uploadUrl, publicUrl } = presignData.data

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('PUT', uploadUrl)
        xhr.setRequestHeader('Content-Type', file.type)
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setUploadPct(Math.round((e.loaded / e.total) * 100))
        }
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300) ? resolve() : reject(new Error(`Upload failed (${xhr.status})`))
        xhr.onerror = () => reject(new Error('Upload failed — network error'))
        xhr.send(file)
      })

      setMedia(prev => [...prev, { url: publicUrl, contentType: file.type, name: file.name }])
      // Auto-pick a sensible media type from the file if the user hasn't
      // already chosen something more specific (e.g. they picked "Reel"
      // before selecting the file — don't stomp that).
      if (file.type.startsWith('video/') && mediaType === 'IMAGE') setMediaType('VIDEO')
      showToast(`✓ Uploaded ${file.name}`)
    } catch (e: any) {
      showToast(e.message ?? 'Upload failed')
    } finally {
      setUploading(false)
      setUploadPct(0)
    }
  }

  const onFilesSelected = (files: FileList | null) => {
    if (!files) return
    Array.from(files).forEach(uploadFile)
  }

  const removeMedia = (url: string) => setMedia(prev => prev.filter(m => m.url !== url))

  // Generating N languages used to fire N full /api/ai/generate calls in
  // true parallel (Promise.allSettled) with no per-request timeout. That's
  // fine for 1-2 languages, but at 4 languages × 6 platforms it can push
  // real request latency — and, worse, `fetch` has no timeout by default,
  // so if any single request just hangs (a slow/overloaded serverless
  // function, a stalled connection), the whole button sits on "Adapting…"
  // forever with zero feedback — exactly what RJ hit on video. Two fixes:
  // a hard per-request timeout so a hang always resolves to a visible
  // error instead of spinning silently, and a concurrency cap so a big
  // multi-language request doesn't throw everything at the backend at
  // once in the first place.
  const GENERATE_TIMEOUT_MS = 45000
  const GENERATE_CONCURRENCY = 2

  const generate = async () => {
    if (!raw.trim()) { showToast('Write your idea first'); return }
    if (platforms.length === 0) { showToast('Pick at least one platform'); return }
    if (languages.length === 0) { showToast('Pick at least one language'); return }
    setLoading(true)
    setPreviews({})
    setSaved(false)
    setLimitBanner('')
    setGenProgress({ done: 0, total: languages.length })

    let creditsRemaining: number | null = null
    let limitHit = ''
    let hardErrorShown = false
    let activeLanguageSet = false
    const succeeded: string[] = []

    const runOne = async (lang: string) => {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), GENERATE_TIMEOUT_MS)
      try {
        const res = await fetch('/api/ai/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            rawContent: raw,
            tone,
            format,
            language: LANG_CODE[lang] ?? lang,
            platforms: platforms.map(p => p.toUpperCase()),
          }),
        })
        const data = await res.json()
        if (data.success) {
          const gen = data.data.generated
          const mapped: Record<string, PlatformOutput> = {}
          platforms.forEach(p => { if (gen[p.toUpperCase()]) mapped[p] = gen[p.toUpperCase()] })
          // Set as each language finishes rather than waiting for all of
          // them — with several languages selected, the first one to
          // finish shows up immediately instead of everything appearing
          // (or not) in one batch at the very end.
          setPreviews(prev => ({ ...prev, [lang]: mapped }))
          if (!activeLanguageSet) { activeLanguageSet = true; setActiveLanguage(lang) }
          succeeded.push(lang)
          creditsRemaining = data.data.creditsRemaining
        } else if (res.status === 402) {
          limitHit = data.error ?? 'Plan limit reached'
        } else {
          hardErrorShown = true
          showToast(data.error ?? `Generation failed for ${lang}`)
        }
      } catch (e) {
        hardErrorShown = true
        const timedOut = e instanceof DOMException && e.name === 'AbortError'
        showToast(timedOut
          ? `${lang} took too long and timed out — try fewer languages or platforms at once`
          : 'Error connecting to AI — check your connection')
      } finally {
        clearTimeout(timer)
        setGenProgress(p => p ? { ...p, done: p.done + 1 } : p)
      }
    }

    // Bounded-concurrency queue — GENERATE_CONCURRENCY requests in flight
    // at a time rather than all of `languages` at once.
    const queue = [...languages]
    await Promise.all(
      Array.from({ length: Math.min(GENERATE_CONCURRENCY, queue.length) }, async () => {
        while (queue.length > 0) {
          const lang = queue.shift()
          if (lang) await runOne(lang)
        }
      })
    )

    if (succeeded.length > 0) {
      showToast(
        `✦ Adapted for ${succeeded.length} language${succeeded.length > 1 ? 's' : ''}` +
        (creditsRemaining !== null ? ` · ${creditsRemaining} credits left` : '')
      )
    } else if (limitHit) {
      // Nothing generated at all and the reason was a plan limit (e.g. more
      // platforms selected than the plan allows) — always show a toast, not
      // just the LimitBanner. The banner renders inline near the top of the
      // scrollable editor panel and can be scrolled out of view; the toast
      // is fixed-position and always visible regardless of scroll.
      showToast(limitHit)
    } else if (!hardErrorShown) {
      showToast('Generation failed — try again')
    }
    if (limitHit) setLimitBanner(limitHit)
    setLoading(false)
    setGenProgress(null)
  }

  // Build the /api/posts payload from whatever's been generated, restricted to
  // platforms that actually have a connected social account (the API requires
  // a socialAccountId per platform entry — there's nothing to publish to
  // otherwise).
  const buildPlatformPayload = () => {
    const entries = Object.entries(currentPreviews)
    const publishable = entries
      .map(([key, d]) => ({ key, d, account: accountFor(key) }))
      .filter(x => !!x.account)
    const skipped = entries.length - publishable.length
    return {
      skipped,
      platforms: publishable.map(({ key, d, account }) => ({
        platform: key.toUpperCase(),
        socialAccountId: account!.id,
        adaptedText: d.text,
        hashtags: d.hashtags ?? [],
        mediaUrls: media.map(m => m.url),
        mediaType,
      })),
    }
  }

  const submitPost = async (publishNow: boolean) => {
    if (Object.keys(currentPreviews).length === 0) { showToast('Generate content first'); return }
    const { platforms: payloadPlatforms, skipped } = buildPlatformPayload()
    if (payloadPlatforms.length === 0) {
      showToast('None of these platforms are connected yet — go to Settings to connect one')
      return
    }

    // Instagram's publisher rejects a post with no media outright (see
    // publisher.ts) — catching it here, before the request even goes out,
    // turns a confusing server-side failure into a plain "upload something"
    // toast at the moment it's actually actionable.
    if (payloadPlatforms.some(p => p.platform === 'INSTAGRAM') && media.length === 0) {
      showToast('Instagram needs an image or video — upload one below before publishing')
      return
    }

    if (publishNow) setPublishing(true)
    setLimitBanner('')
    showToast(publishNow ? 'Publishing…' : 'Saving draft…')

    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawContent: raw,
          tone,
          format,
          language: activeLanguage,
          publishNow,
          platforms: payloadPlatforms,
        }),
      })
      const data = await res.json()
      if (data.success) {
        const note = skipped > 0 ? ` (${skipped} platform${skipped > 1 ? 's' : ''} skipped — not connected)` : ''
        showToast(publishNow
          ? `🚀 Queued for ${payloadPlatforms.length} platform${payloadPlatforms.length > 1 ? 's' : ''} in ${activeLanguage}${note}`
          : `Draft saved ✓${note}`)
        if (publishNow) {
          // Only clear the language that was just published — if other
          // selected languages still have unpublished previews sitting
          // there (the whole point of generating several at once), switch
          // to the next one instead of wiping everything. Only reset the
          // full form once every generated language has been published.
          const remaining = languages.filter(l => l !== activeLanguage && previews[l])
          setPreviews(prev => {
            const rest = { ...prev }
            delete rest[activeLanguage]
            return rest
          })
          if (remaining.length > 0) {
            setActiveLanguage(remaining[0])
          } else {
            setRaw('')
            setMedia([])
            setMediaType('IMAGE')
            setLanguages(['🇮🇳 English'])
            setActiveLanguage('🇮🇳 English')
          }
          setSaved(false)
        } else {
          setSaved(true)
        }
      } else if (res.status === 402) {
        // Same fix as generate(): a plan-limit failure here must also toast,
        // not just set the (scrollable, easy-to-miss) LimitBanner — otherwise
        // "Publish All" can silently do nothing with zero visible feedback.
        const msg = data.error ?? 'Plan limit reached'
        setLimitBanner(msg)
        showToast(msg)
      } else {
        showToast(data.error ?? 'Something went wrong')
      }
    } catch {
      showToast('Error connecting to the server')
    } finally {
      if (publishNow) setPublishing(false)
    }
  }

  const saveDraft = () => submitPost(false)
  const publishAll = () => submitPost(true)

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#0A0A0F', fontFamily: 'system-ui, sans-serif', color: '#F0F0F8', WebkitFontSmoothing: 'antialiased' }}>

      <button
        aria-label="Open menu"
        className="mobile-menu-btn"
        onClick={() => setMobileNavOpen(o => !o)}
      >
        ☰
      </button>
      <div
        className={`mobile-sidebar-backdrop${mobileNavOpen ? ' open' : ''}`}
        onClick={() => setMobileNavOpen(false)}
      />

      {/* ── SIDEBAR (mini) ── */}
      <aside className={`app-sidebar${mobileNavOpen ? ' mobile-open' : ''}`} style={{ width: 220, flexShrink: 0, background: '#12121A', borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <BharatFlag />
            <span style={{ fontWeight: 900, fontSize: '1.1rem' }}>Vyral<span style={{ color: '#FF9933' }}>Bro</span></span>
            <span style={{ fontSize: '0.58rem', fontWeight: 700, background: 'rgba(37,211,102,0.1)', color: '#25D366', border: '1px solid rgba(37,211,102,0.25)', borderRadius: 20, padding: '2px 7px', minWidth: 36, textAlign: 'center' as const, transition: 'all 0.4s' }}>
              {LANGUAGES[langIdx]}
            </span>
          </div>
        </div>
        <div style={{ padding: '8px 0', flex: 1 }}>
          {[
            { icon: '⊞', label: 'Dashboard', path: '/dashboard' },
            { icon: '✍️', label: 'Post Content', active: true },
            { icon: '📅', label: 'Scheduler', path: '/dashboard/scheduler' },
            { icon: '📚', label: 'Content Library', path: '/dashboard/library' },
            { icon: '📊', label: 'Analytics', path: '/dashboard' },
            { icon: '🔌', label: 'Settings', path: '/settings' },
          ].map(item => (
            <div key={item.label} onClick={() => { setMobileNavOpen(false); if (item.path) router.push(item.path) }}
              style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 10px', margin: '1px 6px', borderRadius: 9, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 500, color: item.active ? '#FF9933' : '#7A7A90', background: item.active ? 'rgba(255,153,51,0.1)' : 'transparent', transition: 'all 0.15s' }}
              onMouseEnter={e => { if (!item.active) { (e.currentTarget as HTMLElement).style.background = '#18181F'; (e.currentTarget as HTMLElement).style.color = '#F0F0F8' } }}
              onMouseLeave={e => { if (!item.active) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#7A7A90' } }}>
              <span style={{ fontSize: '0.9rem', width: 16, textAlign: 'center' as const }}>{item.icon}</span>
              {item.label}
            </div>
          ))}
        </div>
        <div style={{ marginTop: 'auto', padding: '0 6px' }}>
          <UsageMeter />
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
      <div className="studio-main-grid" style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 420px', overflow: 'hidden' }}>

        {/* LEFT: Editor */}
        <div className="mobile-content-pad-top" style={{ borderRight: '1px solid rgba(255,255,255,0.06)', overflowY: 'auto', padding: '2rem 2rem 2rem 2.5rem', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

          {limitBanner && <LimitBanner message={limitBanner} onDismiss={() => setLimitBanner('')} />}

          {/* Header */}
          <div style={{ paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: '#FF9933', marginBottom: 6 }}>✦ Creator Studio</div>
            <div style={{ fontWeight: 900, fontSize: '1.6rem', letterSpacing: '-0.02em', lineHeight: 1.2 }}>Write once.<br /><span style={{ color: '#FF9933', fontStyle: 'italic' }}>Reach Bharat.</span></div>
            <div style={{ fontSize: '0.82rem', color: '#7A7A90', marginTop: 5 }}>One idea → 6 platforms, multiple languages, all AI-adapted in your voice.</div>
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

          {/* Language — multi-select: pick more than one and Generate builds
              a full, independent set of platform posts per language, kept
              on separate tabs above the preview panel. */}
          <div>
            <FieldLabel num="04" label="Language(s)" />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
              {['🇮🇳 English', 'हि Hindi', 'த Tamil', 'ಕ Kannada', 'తె Telugu', 'বাং Bengali', 'मर Marathi'].map(l => (
                <Pill key={l} label={l} active={languages.includes(l)} onClick={() => toggleLanguage(l)} color="green" />
              ))}
            </div>
            {languages.length > 1 && (
              <div style={{ fontSize: '0.7rem', color: '#5A5A72', marginTop: 6 }}>
                Generates a separate set of platform posts per language — switch between them from the tabs above the preview, and publish each when it&apos;s ready.
              </div>
            )}
          </div>

          {/* Platforms */}
          <div>
            <FieldLabel num="05" label="Platforms" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
              {Object.entries(PL).map(([key, name]) => {
                const on = platforms.includes(key)
                const connected = !!accountFor(key)
                return (
                  <div key={key} onClick={() => togglePlatform(key)}
                    style={{ border: `1.5px solid ${on ? PC[key] : 'rgba(255,255,255,0.08)'}`, borderRadius: 12, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', background: on ? '#18181F' : '#12121A', transition: 'all 0.2s', userSelect: 'none' as const }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: PC[key], boxShadow: on ? `0 0 6px ${PC[key]}` : 'none', flexShrink: 0, transition: 'box-shadow 0.2s' }} />
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: on ? PC[key] : '#7A7A90' }}>{name}</div>
                      <div style={{ fontSize: '0.62rem', color: connected ? '#34D399' : '#7A7A90' }}>
                        {connected ? '✓ connected' : 'not connected'}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            {accounts.length === 0 && (
              <div style={{ marginTop: 8, fontSize: '0.75rem', color: '#7A7A90' }}>
                No platforms connected yet — you can still generate previews, but Save/Publish need at least one.{' '}
                <span onClick={() => router.push('/settings')} style={{ color: '#FF9933', cursor: 'pointer', fontWeight: 600 }}>Connect one in Settings →</span>
              </div>
            )}
          </div>

          {/* Media */}
          <div>
            <FieldLabel num="06" label="Media (image / video / Reel / Story)" />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const, marginBottom: 10 }}>
              {MEDIA_TYPE_OPTIONS.map(opt => (
                <div key={opt.key} onClick={() => setMediaType(opt.key)} title={opt.hint}
                  style={{ padding: '7px 12px', borderRadius: 20, border: `1px solid ${mediaType === opt.key ? 'rgba(255,153,51,0.4)' : 'rgba(255,255,255,0.11)'}`, background: mediaType === opt.key ? 'rgba(255,153,51,0.1)' : '#18181F', color: mediaType === opt.key ? '#FF9933' : '#7A7A90', fontSize: '0.76rem', fontWeight: 600, cursor: 'pointer', userSelect: 'none' as const }}>
                  {opt.label}
                </div>
              ))}
            </div>

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, border: '1.5px dashed rgba(255,255,255,0.15)', borderRadius: 12, padding: '18px', cursor: uploading ? 'wait' : 'pointer', color: '#7A7A90', fontSize: '0.82rem', background: '#18181F', transition: 'border-color 0.2s' }}>
              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm" multiple
                onChange={e => onFilesSelected(e.target.files)} disabled={uploading}
                style={{ display: 'none' }} />
              {uploading
                ? <><Spinner /> Uploading… {uploadPct}%</>
                : <>⬆ Drop or click to upload images/video · Reels & Stories supported</>}
            </label>

            {media.length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const, marginTop: 10 }}>
                {media.map(m => (
                  <div key={m.url} style={{ position: 'relative', width: 72, height: 72, borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.11)', background: '#0A0A0F' }}>
                    {m.contentType.startsWith('video/')
                      ? <video src={m.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />
                      : <img src={m.url} alt={m.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                    <div onClick={() => removeMedia(m.url)}
                      style={{ position: 'absolute', top: 2, right: 2, width: 18, height: 18, borderRadius: '50%', background: 'rgba(0,0,0,0.65)', color: '#fff', fontSize: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                      ✕
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div style={{ fontSize: '0.68rem', color: '#5A5A72', marginTop: 6 }}>
              Instagram requires at least one image or video. Stories won&apos;t show your caption on Instagram (Meta doesn&apos;t support it there).
            </div>
          </div>

          {/* Schedule */}
          <div>
            <FieldLabel num="07" label="Schedule" />
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
                ? <><Spinner /> {genProgress && genProgress.total > 1 ? `Adapting… (${genProgress.done}/${genProgress.total} languages)` : 'Adapting for Bharat…'}</>
                : <>✦ Generate with AI</>}
            </button>

            {Object.keys(currentPreviews).length > 0 && (
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

          {isBrandedPlan && (
            <div style={{ fontSize: '0.72rem', color: '#5A5A72' }}>
              Free &amp; Creator plan posts include a small &ldquo;Made with VyralBro&rdquo; credit at the end of the caption.{' '}
              <span onClick={() => router.push('/settings?tab=billing')} style={{ color: '#FF9933', cursor: 'pointer', fontWeight: 600 }}>
                Upgrade to Pro to remove it →
              </span>
            </div>
          )}
        </div>

        {/* RIGHT: Previews */}
        <div className="studio-preview-panel" style={{ background: '#12121A', borderLeft: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#7A7A90' }}>Platform Previews</div>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: 'rgba(255,153,51,0.1)', border: '1px solid rgba(255,153,51,0.25)', color: '#FF9933', letterSpacing: '0.06em' }}>✦ AI Adapted</div>
          </div>

          {/* Language tabs — only shown once more than one language has
              actually been generated, so the common single-language case
              stays exactly as uncluttered as before. */}
          {Object.keys(previews).length > 1 && (
            <div style={{ display: 'flex', gap: 6, padding: '10px 1.5rem 0', flexWrap: 'wrap' as const, flexShrink: 0 }}>
              {Object.keys(previews).map(l => (
                <button key={l} onClick={() => setActiveLanguage(l)}
                  style={{ padding: '5px 12px', borderRadius: 20, border: `1px solid ${activeLanguage === l ? 'rgba(255,153,51,0.4)' : 'rgba(255,255,255,0.11)'}`, background: activeLanguage === l ? 'rgba(255,153,51,0.12)' : 'transparent', color: activeLanguage === l ? '#FF9933' : '#7A7A90', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {l}
                </button>
              ))}
            </div>
          )}

          <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Only shimmer for platforms that haven't come back yet — with
                multiple languages generating, results for the active
                language can arrive while others are still in flight, and
                previously this whole block stayed shimmer-only until every
                language finished, hiding results that were already done. */}
            {loading && platforms.filter(p => !currentPreviews[p]).map((p, i) => (
              <div key={p} style={{ background: '#18181F', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '12px 14px', animationDelay: `${i * 0.08}s` }}>
                <Shimmer width="40%" height={12} mb={12} />
                <Shimmer width="95%" height={11} mb={8} />
                <Shimmer width="80%" height={11} mb={8} />
                <Shimmer width="60%" height={11} mb={0} />
              </div>
            ))}

            {!loading && Object.keys(currentPreviews).length === 0 && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: '#3A3A52', textAlign: 'center' as const, padding: '2rem' }}>
                <div style={{ fontSize: '2.5rem' }}>✦</div>
                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#5A5A72' }}>Your previews will appear here</div>
                <div style={{ fontSize: '0.75rem', color: '#3A3A52' }}>Write your idea and click Generate</div>
              </div>
            )}

            {platforms.map(p => {
              const d = currentPreviews[p]
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
                    {/* Editable — this used to be a read-only <div>, so the only
                        way to fix a typo or reword something the AI generated
                        was to regenerate the whole thing from scratch. Typing
                        here updates `previews[p].text` directly, which is
                        exactly what gets sent as `adaptedText` on publish. */}
                    <textarea
                      value={d.text ?? ''}
                      onChange={e => setPreviews(prev => ({
                        ...prev,
                        [activeLanguage]: { ...prev[activeLanguage], [p]: { ...prev[activeLanguage]?.[p], text: e.target.value } },
                      }))}
                      rows={6}
                      style={{ width: '100%', fontSize: '0.82rem', lineHeight: 1.65, color: '#F0F0F8', whiteSpace: 'pre-wrap', background: 'transparent', border: '1px solid transparent', borderRadius: 8, padding: '2px 4px', margin: '-2px -4px', resize: 'vertical' as const, fontFamily: 'inherit' }}
                      onFocus={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.12)'}
                      onBlur={e => (e.currentTarget as HTMLElement).style.borderColor = 'transparent'}
                    />
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
