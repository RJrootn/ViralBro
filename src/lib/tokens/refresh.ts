// src/lib/tokens/refresh.ts
// Automatic token refresh manager
// Called before every API request that uses stored tokens

import { db }             from '@/lib/db/client'
import { encryptToken, decryptToken } from './encrypt'
import type { SocialPlatform }        from '@prisma/client'

// ── Refresh token if expiring within this window ──────────────────────────
const REFRESH_BUFFER_MINUTES = 30

export async function getValidToken(socialAccountId: string): Promise<string> {
  const account = await db.socialAccount.findUnique({
    where: { id: socialAccountId },
    select: {
      id:             true,
      platform:       true,
      accessToken:    true,
      refreshToken:   true,
      tokenExpiresAt: true,
    },
  })
  if (!account) throw new Error('Social account not found')

  const accessToken = decryptToken(account.accessToken)

  // Check if token needs refresh
  if (account.tokenExpiresAt) {
    const expiresIn = account.tokenExpiresAt.getTime() - Date.now()
    const bufferMs  = REFRESH_BUFFER_MINUTES * 60 * 1000

    if (expiresIn < bufferMs) {
      // Token is expiring soon — refresh it
      return refreshPlatformToken(account.id, account.platform, account.refreshToken)
    }
  }

  return accessToken
}

// ── Platform-specific token refresh ──────────────────────────────────────
async function refreshPlatformToken(
  socialAccountId: string,
  platform: SocialPlatform,
  encryptedRefreshToken: string | null,
): Promise<string> {
  switch (platform) {
    case 'TWITTER':   return refreshTwitterToken(socialAccountId, encryptedRefreshToken)
    case 'LINKEDIN':  return refreshLinkedInToken(socialAccountId, encryptedRefreshToken)
    case 'INSTAGRAM':
    case 'FACEBOOK':  return refreshMetaToken(socialAccountId, encryptedRefreshToken)
    default:
      throw new Error(`Token refresh not supported for ${platform}`)
  }
}

// ── Twitter token refresh ─────────────────────────────────────────────────
async function refreshTwitterToken(id: string, encryptedRefreshToken: string | null): Promise<string> {
  if (!encryptedRefreshToken) throw new Error('No refresh token for Twitter account')

  const refreshToken = decryptToken(encryptedRefreshToken)
  const credentials  = Buffer.from(
    `${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`
  ).toString('base64')

  const res = await fetch('https://api.twitter.com/2/oauth2/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type':  'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type:    'refresh_token',
      refresh_token: refreshToken,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    await markAccountInactive(id, `Token refresh failed: ${err}`)
    throw new Error(`Twitter token refresh failed: ${err}`)
  }

  const data = await res.json()
  const expiresAt = new Date(Date.now() + data.expires_in * 1000)

  await db.socialAccount.update({
    where: { id },
    data: {
      accessToken:    encryptToken(data.access_token),
      refreshToken:   data.refresh_token ? encryptToken(data.refresh_token) : undefined,
      tokenExpiresAt: expiresAt,
    },
  })

  return data.access_token
}

// ── LinkedIn token refresh ────────────────────────────────────────────────
async function refreshLinkedInToken(id: string, encryptedRefreshToken: string | null): Promise<string> {
  if (!encryptedRefreshToken) throw new Error('No refresh token for LinkedIn account')

  const refreshToken = decryptToken(encryptedRefreshToken)

  const res = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'refresh_token',
      refresh_token: refreshToken,
      client_id:     process.env.LINKEDIN_CLIENT_ID!,
      client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
    }),
  })

  if (!res.ok) {
    await markAccountInactive(id, 'LinkedIn token refresh failed')
    throw new Error('LinkedIn token refresh failed')
  }

  const data = await res.json()
  const expiresAt = new Date(Date.now() + data.expires_in * 1000)

  await db.socialAccount.update({
    where: { id },
    data: {
      accessToken:    encryptToken(data.access_token),
      refreshToken:   data.refresh_token ? encryptToken(data.refresh_token) : undefined,
      tokenExpiresAt: expiresAt,
    },
  })

  return data.access_token
}

// ── Meta (Instagram/Facebook) long-lived token refresh ───────────────────
async function refreshMetaToken(id: string, encryptedRefreshToken: string | null): Promise<string> {
  // Meta uses long-lived tokens (60 days) — refresh by exchanging current token
  const account = await db.socialAccount.findUnique({ where: { id }, select: { accessToken: true } })
  if (!account) throw new Error('Account not found')

  const currentToken = decryptToken(account.accessToken)

  const url = new URL('https://graph.facebook.com/v19.0/oauth/access_token')
  url.searchParams.set('grant_type',        'fb_exchange_token')
  url.searchParams.set('client_id',         process.env.META_APP_ID!)
  url.searchParams.set('client_secret',     process.env.META_APP_SECRET!)
  url.searchParams.set('fb_exchange_token', currentToken)

  const res  = await fetch(url.toString())
  const data = await res.json()

  if (data.error) {
    await markAccountInactive(id, data.error.message)
    throw new Error(`Meta token refresh failed: ${data.error.message}`)
  }

  const expiresAt = new Date(Date.now() + (data.expires_in ?? 5184000) * 1000) // default 60 days

  await db.socialAccount.update({
    where: { id },
    data: {
      accessToken:    encryptToken(data.access_token),
      tokenExpiresAt: expiresAt,
    },
  })

  return data.access_token
}

// ── Mark account as inactive when token can't be refreshed ───────────────
async function markAccountInactive(id: string, reason: string) {
  await db.socialAccount.update({
    where: { id },
    data: { isActive: false },
  })
  console.error(`[TokenRefresh] Marked account ${id} inactive: ${reason}`)
}
