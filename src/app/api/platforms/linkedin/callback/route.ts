// src/app/api/platforms/linkedin/callback/route.ts
// LinkedIn OAuth 2.0 callback

import { NextResponse }                  from 'next/server'
import { cookies }                       from 'next/headers'
import { db }                            from '@/lib/db/client'
import { parseOAuthState, encryptToken } from '@/lib/tokens/encrypt'

const LINKEDIN_CLIENT_ID     = process.env.LINKEDIN_CLIENT_ID!
const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET!
const APP_URL                = process.env.NEXT_PUBLIC_APP_URL!
const CALLBACK_URL           = `${APP_URL}/api/platforms/linkedin/callback`

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const code  = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const cookieStore = cookies()

  if (error) {
    const desc = searchParams.get('error_description') ?? 'Access denied'
    return NextResponse.redirect(
      `${APP_URL}/settings?platform=linkedin&error=${encodeURIComponent(desc)}`
    )
  }

  if (!code || !state) {
    return NextResponse.redirect(`${APP_URL}/settings?platform=linkedin&error=missing_params`)
  }

  try {
    // ── CSRF check ────────────────────────────────────────────────────────
    const storedState = cookieStore.get('linkedin_oauth_state')?.value
    if (!storedState || storedState !== state) {
      return NextResponse.redirect(`${APP_URL}/settings?platform=linkedin&error=state_mismatch`)
    }
    cookieStore.delete('linkedin_oauth_state')

    const { workspaceId } = parseOAuthState(state)

    // ── Exchange code for tokens ──────────────────────────────────────────
    const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:    'authorization_code',
        code,
        redirect_uri:  CALLBACK_URL,
        client_id:     LINKEDIN_CLIENT_ID,
        client_secret: LINKEDIN_CLIENT_SECRET,
      }),
    })

    const tokenData = await tokenRes.json()
    if (tokenData.error) throw new Error(`${tokenData.error}: ${tokenData.error_description}`)

    const {
      access_token:  accessToken,
      refresh_token: refreshToken,
      expires_in:    expiresIn,         // seconds
      refresh_token_expires_in: rtExpiresIn,
    } = tokenData

    const tokenExpiresAt = new Date(Date.now() + (expiresIn ?? 5184000) * 1000)

    // ── Fetch LinkedIn profile ────────────────────────────────────────────
    const [profileRes, emailRes] = await Promise.all([
      fetch('https://api.linkedin.com/v2/me?projection=(id,localizedFirstName,localizedLastName,profilePicture(displayImage~:playableStreams))', {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
      fetch('https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))', {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
    ])

    const profileData = await profileRes.json()
    const emailData   = await emailRes.json()

    if (profileData.status === 401 || profileData.serviceErrorCode) {
      throw new Error('Failed to fetch LinkedIn profile — check app permissions')
    }

    const firstName   = profileData.localizedFirstName ?? ''
    const lastName    = profileData.localizedLastName  ?? ''
    const displayName = `${firstName} ${lastName}`.trim()
    const memberId    = profileData.id

    // Profile picture (largest available)
    const pictures: any[] = profileData.profilePicture?.['displayImage~']?.elements ?? []
    const avatarUrl = pictures.length
      ? pictures[pictures.length - 1]?.identifiers?.[0]?.identifier
      : undefined

    // Email (for display/matching only, not stored)
    const email = emailData.elements?.[0]?.['handle~']?.emailAddress

    // Use memberId as username (LinkedIn doesn't have public usernames in v2)
    const platformUsername = email ?? memberId

    // ── Save to DB ────────────────────────────────────────────────────────
    await db.socialAccount.upsert({
      where: { workspaceId_platform: { workspaceId, platform: 'LINKEDIN' } },
      create: {
        workspaceId,
        platform:         'LINKEDIN',
        platformUserId:   memberId,
        platformUsername,
        displayName,
        avatarUrl,
        accessToken:      encryptToken(accessToken),
        refreshToken:     refreshToken ? encryptToken(refreshToken) : null,
        tokenExpiresAt,
        scopes:           ['r_liteprofile', 'r_emailaddress', 'w_member_social'],
      },
      update: {
        platformUserId:   memberId,
        platformUsername,
        displayName,
        avatarUrl,
        accessToken:      encryptToken(accessToken),
        refreshToken:     refreshToken ? encryptToken(refreshToken) : null,
        tokenExpiresAt,
        isActive:         true,
      },
    })

    return NextResponse.redirect(
      `${APP_URL}/settings?platform=linkedin&success=true&username=${encodeURIComponent(displayName)}`
    )
  } catch (err: any) {
    console.error('[LinkedIn OAuth]', err)
    return NextResponse.redirect(
      `${APP_URL}/settings?platform=linkedin&error=${encodeURIComponent(err.message ?? 'Unknown error')}`
    )
  }
}
