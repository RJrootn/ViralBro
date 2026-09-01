// src/app/api/platforms/twitter/callback/route.ts
// Twitter OAuth 2.0 PKCE callback

import { NextResponse }                  from 'next/server'
import { cookies }                       from 'next/headers'
import { db }                            from '@/lib/db/client'
import { parseOAuthState, encryptToken } from '@/lib/tokens/encrypt'

const TWITTER_CLIENT_ID     = process.env.TWITTER_CLIENT_ID!
const TWITTER_CLIENT_SECRET = process.env.TWITTER_CLIENT_SECRET!
const APP_URL               = process.env.NEXT_PUBLIC_APP_URL!
const CALLBACK_URL          = `${APP_URL}/api/platforms/twitter/callback`

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const code    = searchParams.get('code')
  const state   = searchParams.get('state')
  const error   = searchParams.get('error')

  const cookieStore = cookies()

  if (error) {
    return NextResponse.redirect(
      `${APP_URL}/settings?platform=twitter&error=${encodeURIComponent(error)}`
    )
  }

  if (!code || !state) {
    return NextResponse.redirect(`${APP_URL}/settings?platform=twitter&error=missing_params`)
  }

  try {
    // ── CSRF check: compare state ─────────────────────────────────────────
    const storedState    = cookieStore.get('twitter_oauth_state')?.value
    const codeVerifier   = cookieStore.get('twitter_code_verifier')?.value

    if (!storedState || storedState !== state) {
      return NextResponse.redirect(`${APP_URL}/settings?platform=twitter&error=state_mismatch`)
    }
    if (!codeVerifier) {
      return NextResponse.redirect(`${APP_URL}/settings?platform=twitter&error=no_verifier`)
    }

    // Clear cookies
    cookieStore.delete('twitter_code_verifier')
    cookieStore.delete('twitter_oauth_state')

    // ── Parse workspace from state ────────────────────────────────────────
    const { workspaceId } = parseOAuthState(state)

    // ── Exchange code + verifier for tokens ───────────────────────────────
    const credentials = Buffer.from(`${TWITTER_CLIENT_ID}:${TWITTER_CLIENT_SECRET}`).toString('base64')

    const tokenRes = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type':  'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        grant_type:    'authorization_code',
        redirect_uri:  CALLBACK_URL,
        code_verifier: codeVerifier,
      }),
    })

    const tokenData = await tokenRes.json()
    if (tokenData.error) throw new Error(`${tokenData.error}: ${tokenData.error_description}`)

    const {
      access_token:  accessToken,
      refresh_token: refreshToken,
      expires_in:    expiresIn,
      scope,
    } = tokenData

    const tokenExpiresAt = expiresIn
      ? new Date(Date.now() + expiresIn * 1000)
      : new Date(Date.now() + 2 * 60 * 60 * 1000) // 2h fallback

    // Twitter's docs list `scope` as always present, but don't guarantee it
    // for every grant — fall back to [] rather than throwing on a missing
    // field that isn't otherwise load-bearing for the connection to work.
    const scopes: string[] = typeof scope === 'string' ? scope.split(' ') : []

    // ── Fetch Twitter profile ─────────────────────────────────────────────
    const profileRes = await fetch(
      'https://api.twitter.com/2/users/me?user.fields=id,name,username,profile_image_url,public_metrics,verified',
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    const profileData = await profileRes.json()
    if (profileData.errors) throw new Error(profileData.errors[0].message)

    const profile = profileData.data

    // ── Save to DB ────────────────────────────────────────────────────────
    await db.socialAccount.upsert({
      where: { workspaceId_platform: { workspaceId, platform: 'TWITTER' } },
      create: {
        workspaceId,
        platform:        'TWITTER',
        platformUserId:   profile.id,
        platformUsername: profile.username,
        displayName:      profile.name,
        avatarUrl:        profile.profile_image_url?.replace('_normal', '_400x400'),
        accessToken:      encryptToken(accessToken),
        refreshToken:     refreshToken ? encryptToken(refreshToken) : null,
        tokenExpiresAt,
        scopes:           scopes,
      },
      update: {
        platformUserId:   profile.id,
        platformUsername: profile.username,
        displayName:      profile.name,
        avatarUrl:        profile.profile_image_url?.replace('_normal', '_400x400'),
        accessToken:      encryptToken(accessToken),
        refreshToken:     refreshToken ? encryptToken(refreshToken) : null,
        tokenExpiresAt,
        scopes:           scopes,
        isActive:         true,
      },
    })

    return NextResponse.redirect(
      `${APP_URL}/settings?platform=twitter&success=true&username=${profile.username}`
    )
  } catch (err: any) {
    console.error('[Twitter OAuth]', err)
    return NextResponse.redirect(
      `${APP_URL}/settings?platform=twitter&error=${encodeURIComponent(err.message ?? 'Unknown error')}`
    )
  }
}
