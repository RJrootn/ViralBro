'use client'
// src/components/platforms/PlatformConnector.tsx
// The "Connect Accounts" UI on the Settings page
// Shows connection status, connect/disconnect buttons, token expiry

import { useState, useEffect, useCallback } from 'react'
import toast                   from 'react-hot-toast'
import type { ConnectedAccount, SocialPlatform } from '@/types/oauth'
import { invalidateConnectedAccounts } from '@/lib/hooks/useConnectedAccounts'
import { explainOAuthError } from '@/lib/oauth/errorMessages'

// ── Platform display config ───────────────────────────────────────────────
const PLATFORMS: {
  id:          SocialPlatform
  name:        string
  description: string
  color:       string
  bg:          string
  emoji:       string
  connectPath: string
  features:    string[]
}[] = [
  {
    id:          'INSTAGRAM',
    name:        'Instagram',
    description: 'Reels, feed posts, stories & insights',
    color:       '#E1306C',
    bg:          'rgba(225,48,108,0.08)',
    emoji:       '📸',
    connectPath: '/api/platforms/instagram',
    features:    ['Feed posts', 'Reels captions', 'Story links', 'Insights'],
  },
  {
    id:          'TWITTER',
    name:        'X / Twitter',
    description: 'Tweets, threads & analytics',
    color:       '#1DA1F2',
    bg:          'rgba(29,161,242,0.08)',
    emoji:       '🐦',
    connectPath: '/api/platforms/twitter',
    features:    ['Tweets', 'Threads', 'Analytics', 'Scheduling'],
  },
  {
    id:          'LINKEDIN',
    name:        'LinkedIn',
    description: 'Professional posts, articles & engagement',
    color:       '#0077B5',
    bg:          'rgba(0,119,181,0.08)',
    emoji:       '💼',
    connectPath: '/api/platforms/linkedin',
    features:    ['Posts', 'Articles', 'Comments', 'Analytics'],
  },
  {
    id:          'YOUTUBE',
    name:        'YouTube',
    description: 'Shorts & video descriptions — coming soon',
    color:       '#FF0000',
    bg:          'rgba(255,0,0,0.08)',
    emoji:       '▶️',
    connectPath: '/api/platforms/youtube',
    features:    ['Shorts', 'Descriptions', 'Community posts'],
  },
  {
    id:          'FACEBOOK',
    name:        'Facebook',
    description: 'Page posts, reels & insights — coming soon',
    color:       '#1877F2',
    bg:          'rgba(24,119,242,0.08)',
    emoji:       '📘',
    connectPath: '/api/platforms/facebook',
    features:    ['Page posts', 'Reels', 'Insights'],
  },
  {
    id:          'WHATSAPP',
    name:        'WhatsApp',
    description: 'Broadcast lists — coming soon',
    color:       '#25D366',
    bg:          'rgba(37,211,102,0.08)',
    emoji:       '💬',
    connectPath: '/api/platforms/whatsapp',
    features:    ['Broadcasts', 'Status updates'],
  },
]

const LIVE_PLATFORMS: SocialPlatform[] = ['INSTAGRAM', 'TWITTER', 'LINKEDIN']

// ── Component ─────────────────────────────────────────────────────────────
export function PlatformConnector() {
  const [accounts,      setAccounts]      = useState<ConnectedAccount[]>([])
  const [loading,       setLoading]       = useState(true)
  const [disconnecting, setDisconnecting] = useState<SocialPlatform | null>(null)
  const [refreshing,    setRefreshing]    = useState<SocialPlatform | null>(null)
  const [preflightPlatform, setPreflightPlatform] = useState<typeof PLATFORMS[number] | null>(null)

  const handleOAuthReturn = useCallback(() => {
    const params   = new URLSearchParams(window.location.search)
    const platform = params.get('platform')
    const success  = params.get('success')
    const error    = params.get('error')
    const username = params.get('username')

    if (platform && success) {
      toast.success(`✓ ${platform} connected${username ? ` as @${username}` : ''}`)
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname)
      fetchAccounts()
      invalidateConnectedAccounts() // sidebar's cached list should show this immediately, not on its next remount
    } else if (platform && error) {
      // Plain-English explanation instead of raw error codes/API text — see
      // src/lib/oauth/errorMessages.ts for why (a customer can't act on
      // "no_instagram_business_account" the way they can on a real
      // explanation + next step).
      const explained = explainOAuthError(platform, decodeURIComponent(error))
      toast.error(
        <div>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>{explained.headline}</div>
          <div style={{ fontSize: '0.85em', opacity: 0.9 }}>{explained.detail}</div>
          {explained.linkHref && (
            <a href={explained.linkHref} target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-block', marginTop: 6, fontSize: '0.85em', fontWeight: 600, textDecoration: 'underline' }}>
              {explained.linkText}
            </a>
          )}
        </div>,
        { duration: 10000 }
      )
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  useEffect(() => {
    fetchAccounts()
    // Check for success/error from OAuth callback
    handleOAuthReturn()
  }, [handleOAuthReturn])

  async function fetchAccounts() {
    try {
      const res  = await fetch('/api/platforms/connect')
      const data = await res.json()
      if (data.success) setAccounts(data.data.accounts)
    } finally {
      setLoading(false)
    }
  }

  function getAccount(platform: SocialPlatform) {
    return accounts.find(a => a.platform === platform)
  }

  function isTokenExpiringSoon(account: ConnectedAccount) {
    if (!account.tokenExpiresAt) return false
    const daysLeft = (new Date(account.tokenExpiresAt).getTime() - Date.now()) / 86400000
    return daysLeft < 7
  }

  async function disconnect(platform: SocialPlatform) {
    if (!confirm(`Disconnect ${platform}? You can reconnect anytime.`)) return
    setDisconnecting(platform)
    try {
      const res = await fetch(`/api/platforms/disconnect?platform=${platform}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        toast.success(`${platform} disconnected`)
        setAccounts(prev => prev.filter(a => a.platform !== platform))
        invalidateConnectedAccounts() // sidebar's cached list should drop this immediately, not on its next remount
      } else {
        toast.error(data.error ?? 'Failed to disconnect')
      }
    } finally {
      setDisconnecting(null)
    }
  }

  async function refreshToken(platform: SocialPlatform) {
    setRefreshing(platform)
    try {
      const res  = await fetch('/api/platforms/refresh', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ platform }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`${platform} token refreshed ✓`)
        fetchAccounts()
      } else {
        toast.error(data.error ?? 'Refresh failed — please reconnect')
      }
    } finally {
      setRefreshing(null)
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-48 rounded-2xl bg-surface-2 animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="page-eyebrow">Connections</p>
        <h2 className="font-display text-2xl font-bold mt-1">Connect Your Platforms</h2>
        <p className="text-sm text-white/50 mt-2">
          Connect once — Vyral handles token refresh automatically.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {PLATFORMS.map(plat => {
          const account  = getAccount(plat.id)
          const isLive   = LIVE_PLATFORMS.includes(plat.id)
          const expiring = account && isTokenExpiringSoon(account)

          return (
            <div
              key={plat.id}
              className="surface-card p-5 flex flex-col gap-4 relative overflow-hidden"
              style={{ borderColor: account ? `${plat.color}30` : undefined }}
            >
              {/* Connected glow */}
              {account && (
                <div
                  className="absolute inset-0 opacity-5 pointer-events-none"
                  style={{ background: `radial-gradient(circle at 0% 0%, ${plat.color}, transparent 70%)` }}
                />
              )}

              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                    style={{ background: plat.bg }}
                  >
                    {plat.emoji}
                  </div>
                  <div>
                    <div className="font-semibold text-sm" style={{ color: plat.color }}>
                      {plat.name}
                    </div>
                    <div className="text-xs text-white/40 mt-0.5">{plat.description}</div>
                  </div>
                </div>

                {/* Status badge */}
                {account ? (
                  <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 whitespace-nowrap">
                    ✓ Connected
                  </span>
                ) : !isLive ? (
                  <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-white/5 text-white/30 border border-white/10">
                    Soon
                  </span>
                ) : null}
              </div>

              {/* Connected account info */}
              {account && (
                <div className="bg-surface-3 rounded-xl p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    {account.avatarUrl ? (
                      <img
                        src={account.avatarUrl}
                        alt={account.displayName ?? ''}
                        className="w-7 h-7 rounded-full object-cover"
                      />
                    ) : (
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                        style={{ background: plat.color }}
                      >
                        {(account.displayName ?? account.platformUsername).charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="text-xs font-semibold text-white/90">
                        {account.displayName ?? account.platformUsername}
                      </div>
                      <div className="text-[10px] text-white/40">
                        @{account.platformUsername}
                      </div>
                    </div>
                  </div>

                  {/* Token expiry warning */}
                  {expiring && (
                    <div className="flex items-center gap-2 text-[10px] text-amber-400">
                      <span>⚠</span>
                      <span>Token expires soon —</span>
                      <button
                        className="underline font-semibold"
                        onClick={() => refreshToken(plat.id)}
                        disabled={refreshing === plat.id}
                      >
                        {refreshing === plat.id ? 'Refreshing…' : 'Refresh now'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Features */}
              <div className="flex flex-wrap gap-1.5">
                {plat.features.map(f => (
                  <span
                    key={f}
                    className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                    style={{ background: `${plat.color}15`, color: plat.color }}
                  >
                    {f}
                  </span>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-auto">
                {account ? (
                  <>
                    <a
                      href={plat.connectPath}
                      className="flex-1 text-center text-xs font-semibold py-2 rounded-xl border border-white/10 bg-surface-2 text-white/60 hover:text-white hover:border-white/20 transition-all"
                    >
                      Reconnect
                    </a>
                    <button
                      onClick={() => disconnect(plat.id)}
                      disabled={disconnecting === plat.id}
                      className="px-4 text-xs font-semibold py-2 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-50"
                    >
                      {disconnecting === plat.id ? '…' : 'Disconnect'}
                    </button>
                  </>
                ) : isLive ? (
                  plat.id === 'INSTAGRAM' ? (
                    <button
                      onClick={() => setPreflightPlatform(plat)}
                      className="btn-saffron flex-1 text-center text-xs py-2.5"
                    >
                      Connect {plat.name}
                    </button>
                  ) : (
                    <a
                      href={plat.connectPath}
                      className="btn-saffron flex-1 text-center text-xs py-2.5"
                    >
                      Connect {plat.name}
                    </a>
                  )
                ) : (
                  <button
                    disabled
                    className="flex-1 text-xs font-semibold py-2.5 rounded-xl bg-surface-2 text-white/20 cursor-not-allowed"
                  >
                    Coming Soon
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Connected count summary */}
      <div className="flex items-center gap-3 text-sm text-white/40">
        <span
          className="font-bold text-lg"
          style={{ color: accounts.length > 0 ? '#FF9933' : undefined }}
        >
          {accounts.length}
        </span>
        <span>of 6 platforms connected</span>
        {accounts.length === 0 && (
          <span className="text-white/30">— Connect at least one to start publishing</span>
        )}
      </div>

      {/* Instagram pre-flight check — catches the single most common dead-end
          we hit ourselves (see claude/vyralbro-customer-onboarding-notes.md):
          Instagram OAuth silently fails with no_instagram_business_account
          if the account isn't a Business/Creator account linked to a
          Facebook Page. Confirming this before the OAuth round-trip saves a
          customer from a confusing error after the fact. */}
      {preflightPlatform && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setPreflightPlatform(null)}
        >
          <div
            className="surface-card max-w-md w-full p-6 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                style={{ background: preflightPlatform.bg }}>
                {preflightPlatform.emoji}
              </div>
              <div className="font-semibold text-base">Before you connect {preflightPlatform.name}</div>
            </div>

            <p className="text-sm text-white/70">
              VyralBro can only publish to Instagram <strong>Business or Creator</strong> accounts that
              are linked to a Facebook Page you manage — not personal Instagram accounts. Two quick checks:
            </p>

            <ul className="text-sm text-white/60 space-y-2 list-disc list-inside">
              <li>Your Instagram account is switched to Business or Creator (Settings → Account type)</li>
              <li>It&apos;s linked to a Facebook Page you have admin access to</li>
            </ul>

            <a
              href="https://help.instagram.com/502981923235522"
              target="_blank" rel="noopener noreferrer"
              className="text-sm font-semibold underline"
              style={{ color: preflightPlatform.color }}
            >
              How do I check / switch this? →
            </a>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setPreflightPlatform(null)}
                className="flex-1 text-xs font-semibold py-2.5 rounded-xl border border-white/10 bg-surface-2 text-white/60 hover:text-white transition-all"
              >
                Not yet — let me check
              </button>
              <a
                href={preflightPlatform.connectPath}
                className="btn-saffron flex-1 text-center text-xs py-2.5"
              >
                Yes, continue →
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
