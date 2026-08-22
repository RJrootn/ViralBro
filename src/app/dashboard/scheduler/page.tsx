// src/app/dashboard/scheduler/page.tsx
//
// Scheduler — real page. Pulls SCHEDULED posts from GET /api/posts?status=SCHEDULED
// (same data source as Content Library) and groups them by day. This is not
// a calendar UI (no drag-to-reschedule yet) — it's an honest list of what's
// actually queued, in order, which is what was missing before: clicking
// "Scheduler" in the sidebar did nothing at all.

'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PLATFORM_COLORS_BY_ENUM, PLATFORM_LABELS } from '@/lib/constants/platforms'

interface PlatformRow {
  id: string
  platform: string
  status: string
}

interface PostRow {
  id: string
  title: string | null
  rawContent: string
  mediaUrls: string[]
  scheduledAt: string | null
  platforms: PlatformRow[]
}

function dayLabel(dateStr: string) {
  const d = new Date(dateStr)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString()
  if (sameDay(d, today)) return 'Today'
  if (sameDay(d, tomorrow)) return 'Tomorrow'
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
}

export default function SchedulerPage() {
  const router = useRouter()
  const [posts, setPosts] = useState<PostRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/posts?status=SCHEDULED&limit=100')
      .then(res => res.json())
      .then(data => {
        if (data.success) setPosts(data.data.posts)
        else setError(data.error ?? 'Failed to load scheduled posts')
      })
      .catch(() => setError('Failed to load scheduled posts'))
      .finally(() => setLoading(false))
  }, [])

  const sorted = [...posts]
    .filter(p => p.scheduledAt)
    .sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime())

  const groups: { label: string; posts: PostRow[] }[] = []
  for (const p of sorted) {
    const label = dayLabel(p.scheduledAt!)
    const g = groups.find(g => g.label === label)
    if (g) g.posts.push(p)
    else groups.push({ label, posts: [p] })
  }

  return (
    <>
        <div style={{ height: 54, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,#FF9933 33.33%,#fff 33.33% 66.66%,#138808 66.66%)' }} />
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '-0.01em' }}>Scheduler</div>
            <div style={{ fontSize: '0.72rem', color: '#5A5A72' }}>Everything queued to publish, in order</div>
          </div>
          <button onClick={() => router.push('/studio')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg,#FF9933,#FF6B00)', fontSize: '0.78rem', fontWeight: 700, color: '#fff', cursor: 'pointer', boxShadow: '0 2px 12px rgba(255,153,51,0.3)', fontFamily: 'inherit' }}>
            + Schedule a post
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px 24px' }}>
          {loading && <div style={{ color: '#5A5A72', fontSize: '0.85rem', padding: '40px 0', textAlign: 'center' as const }}>Loading…</div>}

          {!loading && error && (
            <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 10, padding: '12px 16px', color: '#F87171', fontSize: '0.8rem', fontWeight: 600 }}>
              {error}
            </div>
          )}

          {!loading && !error && groups.length === 0 && (
            <div style={{ background: '#12121A', border: '1px dashed rgba(255,255,255,0.11)', borderRadius: 14, padding: '48px 24px', textAlign: 'center' as const }}>
              <div style={{ fontSize: '1.6rem', marginBottom: 10 }}>📅</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 6 }}>Nothing scheduled</div>
              <div style={{ fontSize: '0.78rem', color: '#7A7A90', marginBottom: 16 }}>
                Schedule a post from Studio and it&apos;ll show up here in order.
              </div>
              <button onClick={() => router.push('/studio')}
                style={{ padding: '8px 18px', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg,#FF9933,#FF6B00)', fontSize: '0.78rem', fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>
                + Schedule a post
              </button>
            </div>
          )}

          {!loading && !error && groups.map(g => (
            <div key={g.label} style={{ marginBottom: 22 }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: '#5A5A72', marginBottom: 10 }}>{g.label}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {g.posts.map(p => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#12121A', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '12px 16px' }}>
                    <div style={{ width: 44, height: 44, borderRadius: 9, background: '#1E1E28', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                      {p.mediaUrls?.[0]
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={p.mediaUrls[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <span style={{ fontSize: '1.1rem', opacity: 0.4 }}>📝</span>}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {p.title || p.rawContent}
                      </div>
                      <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                        {p.platforms.map(pl => (
                          <span key={pl.id} style={{ fontSize: '0.58rem', fontWeight: 800, padding: '1px 6px', borderRadius: 4, background: `${PLATFORM_COLORS_BY_ENUM[pl.platform] ?? '#7A7A90'}22`, color: PLATFORM_COLORS_BY_ENUM[pl.platform] ?? '#7A7A90' }}>
                            {PLATFORM_LABELS[pl.platform] ?? pl.platform}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div style={{ flexShrink: 0, fontSize: '0.75rem', fontWeight: 700, color: '#FBBF24' }}>
                      {new Date(p.scheduledAt!).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
    </>
  )
}
