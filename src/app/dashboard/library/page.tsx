// src/app/dashboard/library/page.tsx
//
// Content Library — real page. Reads GET /api/posts (already returns each
// Post with its PostPlatform rows, mediaUrls/mediaType, and status) and
// renders it. Nothing here is sample/fabricated data — if a workspace has
// no posts yet, this shows an honest empty state instead of pretend rows.

'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/dashboard/Sidebar'
import { PLATFORM_COLORS_BY_ENUM, PLATFORM_LABELS, STATUS_COLORS, STATUS_LABELS } from '@/lib/constants/platforms'

interface PlatformRow {
  id: string
  platform: string
  status: string
  socialAccount?: { platform: string; platformUsername: string }
}

interface PostRow {
  id: string
  title: string | null
  rawContent: string
  status: string
  mediaUrls: string[]
  mediaType: string
  scheduledAt: string | null
  publishedAt: string | null
  createdAt: string
  platforms: PlatformRow[]
}

const FILTERS = [
  { key: undefined, label: 'All' },
  { key: 'DRAFT', label: 'Draft' },
  { key: 'SCHEDULED', label: 'Scheduled' },
  { key: 'PUBLISHED', label: 'Published' },
  { key: 'FAILED', label: 'Failed' },
] as const

export default function ContentLibraryPage() {
  const router = useRouter()
  const [posts, setPosts] = useState<PostRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<string | undefined>(undefined)

  useEffect(() => {
    setLoading(true)
    const qs = filter ? `?status=${filter}` : ''
    fetch(`/api/posts${qs}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) setPosts(data.data.posts)
        else setError(data.error ?? 'Failed to load posts')
      })
      .catch(() => setError('Failed to load posts'))
      .finally(() => setLoading(false))
  }, [filter])

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#0A0A0F', fontFamily: 'system-ui, sans-serif', color: '#F0F0F8', WebkitFontSmoothing: 'antialiased' }}>
      <Sidebar active="library" />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0E0E16' }}>
        <div style={{ height: 54, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,#FF9933 33.33%,#fff 33.33% 66.66%,#138808 66.66%)' }} />
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '-0.01em' }}>Content Library</div>
            <div style={{ fontSize: '0.72rem', color: '#5A5A72' }}>Every post you've created, drafted, or published</div>
          </div>
          <button onClick={() => router.push('/studio')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg,#FF9933,#FF6B00)', fontSize: '0.78rem', fontWeight: 700, color: '#fff', cursor: 'pointer', boxShadow: '0 2px 12px rgba(255,153,51,0.3)', fontFamily: 'inherit' }}>
            + Post Content
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px 24px' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
            {FILTERS.map(f => (
              <button key={f.label} onClick={() => setFilter(f.key)}
                style={{
                  padding: '6px 14px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.11)',
                  background: filter === f.key ? 'rgba(255,153,51,0.12)' : '#18181F',
                  color: filter === f.key ? '#FF9933' : '#7A7A90',
                  fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                }}>
                {f.label}
              </button>
            ))}
          </div>

          {loading && <div style={{ color: '#5A5A72', fontSize: '0.85rem', padding: '40px 0', textAlign: 'center' as const }}>Loading…</div>}

          {!loading && error && (
            <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 10, padding: '12px 16px', color: '#F87171', fontSize: '0.8rem', fontWeight: 600 }}>
              {error}
            </div>
          )}

          {!loading && !error && posts.length === 0 && (
            <div style={{ background: '#12121A', border: '1px dashed rgba(255,255,255,0.11)', borderRadius: 14, padding: '48px 24px', textAlign: 'center' as const }}>
              <div style={{ fontSize: '1.6rem', marginBottom: 10 }}>📚</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 6 }}>
                {filter ? `No ${STATUS_LABELS[filter]?.toLowerCase() ?? filter.toLowerCase()} posts yet` : 'No posts yet'}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#7A7A90', marginBottom: 16 }}>
                Posts you create in Studio will show up here.
              </div>
              <button onClick={() => router.push('/studio')}
                style={{ padding: '8px 18px', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg,#FF9933,#FF6B00)', fontSize: '0.78rem', fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>
                + Create your first post
              </button>
            </div>
          )}

          {!loading && !error && posts.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
              {posts.map(p => {
                const thumb = p.mediaUrls?.[0]
                return (
                  <div key={p.id} style={{ background: '#12121A', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, overflow: 'hidden', cursor: 'pointer', transition: 'all 0.2s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.15)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)' }}>
                    <div style={{ width: '100%', height: 140, background: '#1E1E28', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ fontSize: '1.8rem', opacity: 0.4 }}>📝</span>
                      )}
                      <span style={{ position: 'absolute', top: 8, right: 8, fontSize: '0.6rem', fontWeight: 800, padding: '2px 8px', borderRadius: 20, background: `${STATUS_COLORS[p.status] ?? '#7A7A90'}22`, color: STATUS_COLORS[p.status] ?? '#7A7A90', border: `1px solid ${STATUS_COLORS[p.status] ?? '#7A7A90'}55` }}>
                        {STATUS_LABELS[p.status] ?? p.status}
                      </span>
                    </div>
                    <div style={{ padding: '12px 14px' }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>
                        {p.title || p.rawContent}
                      </div>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' as const, marginBottom: 8 }}>
                        {p.platforms.map(pl => (
                          <span key={pl.id} style={{ fontSize: '0.58rem', fontWeight: 800, padding: '1px 6px', borderRadius: 4, background: `${PLATFORM_COLORS_BY_ENUM[pl.platform] ?? '#7A7A90'}22`, color: PLATFORM_COLORS_BY_ENUM[pl.platform] ?? '#7A7A90' }}>
                            {PLATFORM_LABELS[pl.platform] ?? pl.platform}
                          </span>
                        ))}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#5A5A72' }}>
                        {p.publishedAt ? `Published ${new Date(p.publishedAt).toLocaleDateString()}`
                          : p.scheduledAt ? `Scheduled for ${new Date(p.scheduledAt).toLocaleString()}`
                          : `Created ${new Date(p.createdAt).toLocaleDateString()}`}
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
