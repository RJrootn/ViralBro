// src/app/dashboard/library/page.tsx
//
// Content Library — real page. Reads GET /api/posts (already returns each
// Post with its PostPlatform rows, mediaUrls/mediaType, and status) and
// renders it. Nothing here is sample/fabricated data — if a workspace has
// no posts yet, this shows an honest empty state instead of pretend rows.
//
// Live-status polling: a post sitting in PUBLISHING can flip to
// PUBLISHED/FAILED seconds later once the worker finishes, but nothing was
// re-fetching the list, so the badge only ever updated on a manual reload.
// Fixed by silently re-polling every 4s for as long as any post is still
// PUBLISHING, with no visible loading spinner on those refreshes.
//
// Delete: DELETE /api/posts/[id] (new route) — a two-click inline confirm
// on the trash icon rather than a native confirm() dialog, to stay in the
// app's own visual language.
//
// Grid/List view: a per-viewer preference, persisted to localStorage. This
// is the real production app served from vyralbro.in, not an in-conversation
// preview, so localStorage is the right, durable place for it — not the
// browser-storage restriction that applies to sandboxed Artifacts.
//
// Detail modal: clicking a card (anywhere but its action buttons) opens the
// full post — the original idea plus, per platform, the exact adapted text,
// hashtags, live status, and any error message. The list/grid card already
// truncates the caption to two lines, so this is the "what did we actually
// post" view the truncated card can't show.

'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { PLATFORM_COLORS_BY_ENUM, PLATFORM_LABELS, STATUS_COLORS, STATUS_LABELS } from '@/lib/constants/platforms'

interface PlatformRow {
  id: string
  platform: string
  status: string
  adaptedText?: string
  hashtags?: string[]
  errorMessage?: string | null
  platformPostId?: string | null
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

type ViewMode = 'grid' | 'list'
const VIEW_STORAGE_KEY = 'vyralbro-library-view'

function readStoredView(): ViewMode {
  if (typeof window === 'undefined') return 'grid'
  try {
    const stored = window.localStorage.getItem(VIEW_STORAGE_KEY)
    return stored === 'list' ? 'list' : 'grid'
  } catch {
    return 'grid'
  }
}

export default function ContentLibraryPage() {
  const router = useRouter()
  const [posts, setPosts] = useState<PostRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<string | undefined>(undefined)
  const [retrying, setRetrying] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [view, setView] = useState<ViewMode>('grid')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [selectedPost, setSelectedPost] = useState<PostRow | null>(null)

  const filterRef = useRef(filter)
  filterRef.current = filter

  useEffect(() => { setView(readStoredView()) }, [])

  const changeView = (next: ViewMode) => {
    setView(next)
    try { window.localStorage.setItem(VIEW_STORAGE_KEY, next) } catch { /* private mode etc — non-fatal */ }
  }

  // `silent` skips the full-page loading state so background polling
  // doesn't flash the "Loading…" placeholder over live content.
  const load = useCallback((silent = false) => {
    if (!silent) setLoading(true)
    const qs = filterRef.current ? `?status=${filterRef.current}` : ''
    fetch(`/api/posts${qs}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) setPosts(data.data.posts)
        else if (!silent) setError(data.error ?? 'Failed to load posts')
      })
      .catch(() => { if (!silent) setError('Failed to load posts') })
      .finally(() => { if (!silent) setLoading(false) })
  }, [])

  useEffect(() => load(false), [filter, load])

  // Poll while anything is mid-publish, so a card's badge moves from
  // "Publishing" to "Published"/"Failed" on its own within a few seconds.
  useEffect(() => {
    const hasPending = posts.some(p => p.status === 'PUBLISHING')
    if (!hasPending) return
    const interval = setInterval(() => load(true), 4000)
    return () => clearInterval(interval)
  }, [posts, load])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(t)
  }, [toast])

  // Auto-cancel a pending delete confirmation if it's left untouched.
  useEffect(() => {
    if (!confirmDeleteId) return
    const t = setTimeout(() => setConfirmDeleteId(null), 4000)
    return () => clearTimeout(t)
  }, [confirmDeleteId])

  const retryPost = async (postId: string) => {
    setRetrying(postId)
    try {
      const res = await fetch(`/api/posts/${postId}/retry`, { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setToast(`Retrying on ${data.data.retried.join(', ')} — no AI credits used`)
        load()
      } else {
        setToast(data.error ?? 'Retry failed')
      }
    } catch {
      setToast('Retry failed — network error')
    } finally {
      setRetrying(null)
    }
  }

  const deletePost = async (postId: string) => {
    setConfirmDeleteId(null)
    setDeletingId(postId)
    try {
      const res = await fetch(`/api/posts/${postId}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        setPosts(prev => prev.filter(p => p.id !== postId))
        setToast('Post deleted')
        if (selectedPost?.id === postId) setSelectedPost(null)
      } else {
        setToast(data.error ?? 'Delete failed')
      }
    } catch {
      setToast('Delete failed — network error')
    } finally {
      setDeletingId(null)
    }
  }

  const statusBadge = (status: string) => (
    <span style={{ fontSize: '0.6rem', fontWeight: 800, padding: '2px 8px', borderRadius: 20, background: `${STATUS_COLORS[status] ?? '#7A7A90'}22`, color: STATUS_COLORS[status] ?? '#7A7A90', border: `1px solid ${STATUS_COLORS[status] ?? '#7A7A90'}55`, whiteSpace: 'nowrap' as const }}>
      {STATUS_LABELS[status] ?? status}
    </span>
  )

  const dateLine = (p: PostRow) =>
    p.publishedAt ? `Published ${new Date(p.publishedAt).toLocaleDateString()}`
      : p.scheduledAt ? `Scheduled for ${new Date(p.scheduledAt).toLocaleString()}`
      : `Created ${new Date(p.createdAt).toLocaleDateString()}`

  const deleteButton = (p: PostRow, size: 'card' | 'row' = 'card') => {
    const confirming = confirmDeleteId === p.id
    const busy = deletingId === p.id
    return (
      <button
        onClick={e => {
          e.stopPropagation()
          if (busy) return
          if (confirming) deletePost(p.id)
          else setConfirmDeleteId(p.id)
        }}
        disabled={busy}
        title={confirming ? 'Click again to confirm delete' : 'Delete post'}
        style={{
          padding: size === 'card' ? '7px 0' : '5px 10px',
          width: size === 'card' ? '100%' : 'auto',
          borderRadius: 8,
          border: `1px solid ${confirming ? 'rgba(248,113,113,0.6)' : 'rgba(255,255,255,0.11)'}`,
          background: confirming ? 'rgba(248,113,113,0.18)' : 'transparent',
          color: confirming ? '#F87171' : '#7A7A90',
          fontSize: '0.72rem', fontWeight: 700,
          cursor: busy ? 'default' : 'pointer', fontFamily: 'inherit',
          transition: 'all 0.15s',
        }}>
        {busy ? 'Deleting…' : confirming ? 'Confirm delete?' : '🗑 Delete'}
      </button>
    )
  }

  return (
    <>
        <div className="mobile-header-pad" style={{ height: 54, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,#FF9933 33.33%,#fff 33.33% 66.66%,#138808 66.66%)' }} />
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '-0.01em' }}>Content Library</div>
            <div style={{ fontSize: '0.72rem', color: '#5A5A72' }}>Every post you&apos;ve created, drafted, or published</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', border: '1px solid rgba(255,255,255,0.11)', borderRadius: 9, overflow: 'hidden' }}>
              <button onClick={() => changeView('grid')} title="Grid view"
                style={{ padding: '6px 10px', border: 'none', background: view === 'grid' ? 'rgba(255,153,51,0.14)' : 'transparent', color: view === 'grid' ? '#FF9933' : '#7A7A90', cursor: 'pointer', fontSize: '0.85rem', lineHeight: 1 }}>
                ▦
              </button>
              <button onClick={() => changeView('list')} title="List view"
                style={{ padding: '6px 10px', border: 'none', borderLeft: '1px solid rgba(255,255,255,0.11)', background: view === 'list' ? 'rgba(255,153,51,0.14)' : 'transparent', color: view === 'list' ? '#FF9933' : '#7A7A90', cursor: 'pointer', fontSize: '0.85rem', lineHeight: 1 }}>
                ☰
              </button>
            </div>
            <button onClick={() => router.push('/studio')}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg,#FF9933,#FF6B00)', fontSize: '0.78rem', fontWeight: 700, color: '#fff', cursor: 'pointer', boxShadow: '0 2px 12px rgba(255,153,51,0.3)', fontFamily: 'inherit' }}>
              + Post Content
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px 24px', position: 'relative' as const }}>
          {toast && (
            <div style={{ position: 'fixed', bottom: 24, right: 24, background: '#18181F', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, padding: '10px 16px', fontSize: '0.78rem', fontWeight: 600, color: '#F0F0F8', boxShadow: '0 8px 24px rgba(0,0,0,0.4)', zIndex: 50 }}>
              {toast}
            </div>
          )}
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

          {!loading && !error && posts.length > 0 && view === 'grid' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
              {posts.map(p => {
                const thumb = p.mediaUrls?.[0]
                return (
                  <div key={p.id} onClick={() => setSelectedPost(p)}
                    style={{ background: '#12121A', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, overflow: 'hidden', cursor: 'pointer', transition: 'all 0.2s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.15)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)' }}>
                    <div style={{ width: '100%', height: 140, background: '#1E1E28', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ fontSize: '1.8rem', opacity: 0.4 }}>📝</span>
                      )}
                      <span style={{ position: 'absolute', top: 8, right: 8 }}>{statusBadge(p.status)}</span>
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
                      <div style={{ fontSize: '0.68rem', color: '#5A5A72', marginBottom: p.platforms.some(pl => pl.status === 'FAILED') ? 8 : 0 }}>
                        {dateLine(p)}
                      </div>
                      {p.platforms.some(pl => pl.status === 'FAILED') && (
                        <button
                          onClick={e => { e.stopPropagation(); retryPost(p.id) }}
                          disabled={retrying === p.id}
                          style={{
                            marginTop: 2, width: '100%', padding: '7px 0', borderRadius: 8,
                            border: '1px solid rgba(248,113,113,0.35)',
                            background: retrying === p.id ? 'rgba(248,113,113,0.06)' : 'rgba(248,113,113,0.12)',
                            color: '#F87171', fontSize: '0.72rem', fontWeight: 700,
                            cursor: retrying === p.id ? 'default' : 'pointer', fontFamily: 'inherit',
                          }}>
                          {retrying === p.id ? 'Retrying…' : '↻ Retry failed platform(s)'}
                        </button>
                      )}
                      <div style={{ marginTop: 8 }}>{deleteButton(p, 'card')}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {!loading && !error && posts.length > 0 && view === 'list' && (
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
              {posts.map(p => {
                const thumb = p.mediaUrls?.[0]
                return (
                  <div key={p.id} onClick={() => setSelectedPost(p)}
                    style={{ display: 'flex', alignItems: 'center', gap: 14, background: '#12121A', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '10px 14px', cursor: 'pointer', transition: 'all 0.15s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.15)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)' }}>
                    <div style={{ width: 48, height: 48, borderRadius: 8, background: '#1E1E28', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ fontSize: '1.1rem', opacity: 0.4 }}>📝</span>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {p.title || p.rawContent}
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {p.platforms.map(pl => (
                            <span key={pl.id} style={{ fontSize: '0.58rem', fontWeight: 800, padding: '1px 6px', borderRadius: 4, background: `${PLATFORM_COLORS_BY_ENUM[pl.platform] ?? '#7A7A90'}22`, color: PLATFORM_COLORS_BY_ENUM[pl.platform] ?? '#7A7A90' }}>
                              {PLATFORM_LABELS[pl.platform] ?? pl.platform}
                            </span>
                          ))}
                        </div>
                        <span style={{ fontSize: '0.68rem', color: '#5A5A72' }}>{dateLine(p)}</span>
                      </div>
                    </div>
                    {statusBadge(p.status)}
                    {p.platforms.some(pl => pl.status === 'FAILED') && (
                      <button
                        onClick={e => { e.stopPropagation(); retryPost(p.id) }}
                        disabled={retrying === p.id}
                        style={{
                          padding: '6px 12px', borderRadius: 8, whiteSpace: 'nowrap' as const,
                          border: '1px solid rgba(248,113,113,0.35)',
                          background: retrying === p.id ? 'rgba(248,113,113,0.06)' : 'rgba(248,113,113,0.12)',
                          color: '#F87171', fontSize: '0.72rem', fontWeight: 700,
                          cursor: retrying === p.id ? 'default' : 'pointer', fontFamily: 'inherit',
                        }}>
                        {retrying === p.id ? 'Retrying…' : '↻ Retry'}
                      </button>
                    )}
                    {deleteButton(p, 'row')}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {selectedPost && (
          <div onClick={() => setSelectedPost(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 24 }}>
            <div onClick={e => e.stopPropagation()}
              style={{ background: '#12121A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, maxWidth: 560, width: '100%', maxHeight: '85vh', overflowY: 'auto' as const, padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                <div style={{ fontSize: '0.68rem', color: '#5A5A72', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>Original idea</div>
                <button onClick={() => setSelectedPost(null)} style={{ background: 'none', border: 'none', color: '#7A7A90', fontSize: '1rem', cursor: 'pointer', lineHeight: 1 }}>✕</button>
              </div>
              <div style={{ fontSize: '0.88rem', color: '#F2F2F8', marginBottom: 18, whiteSpace: 'pre-wrap' as const }}>
                {selectedPost.rawContent}
              </div>

              {selectedPost.mediaUrls?.[0] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={selectedPost.mediaUrls[0]} alt="" style={{ width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: 10, marginBottom: 18 }} />
              )}

              <div style={{ fontSize: '0.68rem', color: '#5A5A72', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.04em', marginBottom: 10 }}>
                What was posted, per platform
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 12 }}>
                {selectedPost.platforms.map(pl => (
                  <div key={pl.id} style={{ background: '#18181F', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '2px 8px', borderRadius: 4, background: `${PLATFORM_COLORS_BY_ENUM[pl.platform] ?? '#7A7A90'}22`, color: PLATFORM_COLORS_BY_ENUM[pl.platform] ?? '#7A7A90' }}>
                        {PLATFORM_LABELS[pl.platform] ?? pl.platform}
                        {pl.socialAccount?.platformUsername ? ` · @${pl.socialAccount.platformUsername}` : ''}
                      </span>
                      {statusBadge(pl.status)}
                    </div>
                    {pl.adaptedText && (
                      <div style={{ fontSize: '0.8rem', color: '#D0D0DC', whiteSpace: 'pre-wrap' as const, marginBottom: pl.hashtags?.length ? 8 : 0 }}>
                        {pl.adaptedText}
                      </div>
                    )}
                    {!!pl.hashtags?.length && (
                      <div style={{ fontSize: '0.76rem', color: '#8585A0' }}>
                        {pl.hashtags.map(h => `#${h.replace(/^#/, '')}`).join(' ')}
                      </div>
                    )}
                    {pl.errorMessage && (
                      <div style={{ marginTop: 8, fontSize: '0.74rem', color: '#F87171' }}>
                        ⚠ {pl.errorMessage}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: '#5A5A72' }}>{dateLine(selectedPost)}</div>
                {deleteButton(selectedPost, 'row')}
              </div>
            </div>
          </div>
        )}
    </>
  )
}
