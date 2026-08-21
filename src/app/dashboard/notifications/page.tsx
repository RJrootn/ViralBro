// src/app/dashboard/notifications/page.tsx
//
// Notifications — real feed, not fabricated. Built from the same PostPlatform
// rows Studio already writes (status, errorMessage, publishedAt, updatedAt)
// via GET /api/posts, rather than inventing a notifications table/pipeline
// that doesn't exist. Each row here is an actual per-platform publish
// outcome — published, failed (with the real error message from the
// platform's API), scheduled, or still publishing.

'use client'
import { useState, useEffect } from 'react'
import Sidebar from '@/components/dashboard/Sidebar'
import { PLATFORM_COLORS_BY_ENUM, PLATFORM_LABELS } from '@/lib/constants/platforms'

interface PlatformRow {
  id: string
  platform: string
  status: string
  errorMessage: string | null
  publishedAt: string | null
  updatedAt: string
}

interface PostRow {
  id: string
  title: string | null
  rawContent: string
  platforms: PlatformRow[]
}

interface Event {
  key: string
  postTitle: string
  platform: string
  status: string
  errorMessage: string | null
  at: string
}

function icon(status: string) {
  if (status === 'PUBLISHED') return { icon: '✅', color: '#34D399' }
  if (status === 'FAILED') return { icon: '⚠️', color: '#F87171' }
  if (status === 'PUBLISHING') return { icon: '⏳', color: '#60A5FA' }
  if (status === 'SCHEDULED') return { icon: '📅', color: '#FBBF24' }
  if (status === 'CANCELLED') return { icon: '🚫', color: '#5A5A72' }
  return { icon: '📝', color: '#7A7A90' }
}

function verb(status: string) {
  if (status === 'PUBLISHED') return 'published to'
  if (status === 'FAILED') return 'failed to publish to'
  if (status === 'PUBLISHING') return 'is publishing to'
  if (status === 'SCHEDULED') return 'is scheduled for'
  if (status === 'CANCELLED') return 'was cancelled for'
  return 'is a draft for'
}

export default function NotificationsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/posts?limit=100')
      .then(res => res.json())
      .then(data => {
        if (!data.success) { setError(data.error ?? 'Failed to load'); return }
        const posts: PostRow[] = data.data.posts
        const evs: Event[] = posts.flatMap(p =>
          p.platforms
            .filter(pl => pl.status !== 'DRAFT') // a plain draft isn't really "an event" yet
            .map(pl => ({
              key: pl.id,
              postTitle: p.title || p.rawContent,
              platform: pl.platform,
              status: pl.status,
              errorMessage: pl.errorMessage,
              at: pl.publishedAt ?? pl.updatedAt,
            }))
        )
        evs.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
        setEvents(evs)
      })
      .catch(() => setError('Failed to load'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#0A0A0F', fontFamily: 'system-ui, sans-serif', color: '#F0F0F8', WebkitFontSmoothing: 'antialiased' }}>
      <Sidebar active="notifications" />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0E0E16' }}>
        <div style={{ height: 54, flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,#FF9933 33.33%,#fff 33.33% 66.66%,#138808 66.66%)' }} />
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '-0.01em' }}>Notifications</div>
            <div style={{ fontSize: '0.72rem', color: '#5A5A72' }}>Real publish outcomes for every post, per platform</div>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px 24px' }}>
          {loading && <div style={{ color: '#5A5A72', fontSize: '0.85rem', padding: '40px 0', textAlign: 'center' as const }}>Loading…</div>}

          {!loading && error && (
            <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 10, padding: '12px 16px', color: '#F87171', fontSize: '0.8rem', fontWeight: 600 }}>
              {error}
            </div>
          )}

          {!loading && !error && events.length === 0 && (
            <div style={{ background: '#12121A', border: '1px dashed rgba(255,255,255,0.11)', borderRadius: 14, padding: '48px 24px', textAlign: 'center' as const }}>
              <div style={{ fontSize: '1.6rem', marginBottom: 10 }}>🔔</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 6 }}>Nothing to show yet</div>
              <div style={{ fontSize: '0.78rem', color: '#7A7A90' }}>
                Once you schedule or publish a post, its status for each platform will show up here.
              </div>
            </div>
          )}

          {!loading && !error && events.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {events.map(e => {
                const { icon: ic, color } = icon(e.status)
                return (
                  <div key={e.key} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, background: '#12121A', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '12px 16px' }}>
                    <div style={{ fontSize: '1.1rem', flexShrink: 0 }}>{ic}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.82rem', lineHeight: 1.5 }}>
                        <span style={{ fontWeight: 600 }}>{e.postTitle}</span>{' '}
                        <span style={{ color }}>{verb(e.status)}</span>{' '}
                        <span style={{ fontWeight: 700, color: PLATFORM_COLORS_BY_ENUM[e.platform] ?? '#7A7A90' }}>
                          {PLATFORM_LABELS[e.platform] ?? e.platform}
                        </span>
                      </div>
                      {e.status === 'FAILED' && e.errorMessage && (
                        <div style={{ fontSize: '0.72rem', color: '#F87171', marginTop: 4, fontFamily: 'monospace' }}>
                          {e.errorMessage}
                        </div>
                      )}
                      <div style={{ fontSize: '0.68rem', color: '#5A5A72', marginTop: 4 }}>
                        {new Date(e.at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
