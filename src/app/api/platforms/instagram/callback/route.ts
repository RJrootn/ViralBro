// src/app/api/platforms/instagram/callback/route.ts
// Handles Meta OAuth callback for Instagram Business accounts
//
// Flow:
//  1. Exchange code → short-lived token
//  2. Exchange → long-lived token (60 days)
//  3. Get Facebook Pages linked to the user
//  4. For each page, get the connected Instagram Business Account
//  5. Save to DB (encrypted)

import { NextResponse }                    from 'next/server'
import { db }                              from '@/lib/db/client'
import { parseOAuthState, encryptToken }   from '@/lib/tokens/encrypt'

const META_APP_ID     = process.env.META_APP_ID!
const META_APP_SECRET = process.env.META_APP_SECRET!
const APP_URL         = process.env.NEXT_PUBLIC_APP_URL!
const CALLBACK_URL    = `${APP_URL}/api/platforms/instagram/callback`

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const code  = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  // ── User denied permission ──────────────────────────────────────────────
  if (error) {
    const desc = searchParams.get('error_description') ?? 'Permission denied'
    return NextResponse.redirect(
      `${APP_URL}/settings?platform=instagram&error=${encodeURIComponent(desc)}`
    )
  }

  if (!code || !state) {
    return NextResponse.redirect(`${APP_URL}/settings?platform=instagram&error=missing_params`)
  }

  try {
    // ── 1. Parse CSRF state ───────────────────────────────────────────────
    const { workspaceId } = parseOAuthState(state)
    const workspace = await db.workspace.findUnique({ where: { id: workspaceId } })
    if (!workspace) throw new Error('Workspace not found')

    // ── 2. Exchange code → short-lived token ─────────────────────────────
    const tokenRes = await fetch('https://graph.facebook.com/v19.0/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id:     META_APP_ID,
        client_secret: META_APP_SECRET,
        redirect_uri:  CALLBACK_URL,
        code,
      }),
    })
    const tokenData = await tokenRes.json()
    if (tokenData.error) throw new Error(tokenData.error.message)
    const shortLivedToken: string = tokenData.access_token

    // ── 3. Exchange → long-lived token (60 days) ──────────────────────────
    const longLivedRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?` +
      new URLSearchParams({
        grant_type:        'fb_exchange_token',
        client_id:         META_APP_ID,
        client_secret:     META_APP_SECRET,
        fb_exchange_token: shortLivedToken,
      })
    )
    const longLivedData = await longLivedRes.json()
    if (longLivedData.error) throw new Error(longLivedData.error.message)

    const longLivedToken: string = longLivedData.access_token
    const expiresIn: number      = longLivedData.expires_in ?? 5184000 // 60 days
    const tokenExpiresAt         = new Date(Date.now() + expiresIn * 1000)

    // ── 4. Get Facebook Pages ─────────────────────────────────────────────
    // /me/accounts is the normal way to list a user's Pages, but it's known
    // to come back empty for Pages owned by a Meta Business Portfolio when
    // the OAuth grant went through the "Choose the Pages you want [app] to
    // access" business-login flow (confirmed by direct testing: /me/accounts
    // returned {data: []} for this exact token, while fetching the Page by
    // ID directly returned instagram_business_account fine). So: try
    // /me/accounts first (works for personal, non-Business Pages), and if
    // it comes back empty, fall back to reading the granted Page IDs out of
    // the token's own granular_scopes via /debug_token — that's the data
    // Meta actually populates for business-login grants — and fetch each of
    // those Pages directly by ID instead.
    const pageFields = 'id,name,access_token,instagram_business_account{id,name,username,profile_picture_url,followers_count}'

    const pagesRes = await fetch(
      `https://graph.facebook.com/v19.0/me/accounts?` +
      new URLSearchParams({ access_token: longLivedToken, fields: pageFields })
    )
    const pagesData = await pagesRes.json()
    if (pagesData.error) throw new Error(pagesData.error.message)

    let pages: any[] = pagesData.data ?? []

    if (pages.length === 0) {
      const debugRes = await fetch(
        `https://graph.facebook.com/v19.0/debug_token?` +
        new URLSearchParams({
          input_token:  longLivedToken,
          access_token: `${META_APP_ID}|${META_APP_SECRET}`,
        })
      )
      const debugData = await debugRes.json()
      const granularScopes: any[] = debugData?.data?.granular_scopes ?? []
      const pageIds: string[] = granularScopes.find(s => s.scope === 'pages_show_list')?.target_ids ?? []

      pages = (
        await Promise.all(
          pageIds.map(async (pageId) => {
            const pageRes = await fetch(
              `https://graph.facebook.com/v19.0/${pageId}?` +
              new URLSearchParams({ access_token: longLivedToken, fields: pageFields })
            )
            const pageJson = await pageRes.json()
            return pageJson.error ? null : pageJson
          })
        )
      ).filter(Boolean)
    }

    // Find page with Instagram Business Account
    const pageWithIG = pages.find(p => p.instagram_business_account)
    if (!pageWithIG) {
      return NextResponse.redirect(
        `${APP_URL}/settings?platform=instagram&error=no_instagram_business_account`
      )
    }

    const igAccount = pageWithIG.instagram_business_account
    const pageToken: string = pageWithIG.access_token // page-level long-lived token

    // ── 5. Save to DB ─────────────────────────────────────────────────────
    await db.socialAccount.upsert({
      where: {
        workspaceId_platform: { workspaceId, platform: 'INSTAGRAM' },
      },
      create: {
        workspaceId,
        platform:        'INSTAGRAM',
        platformUserId:   igAccount.id,
        platformUsername: igAccount.username ?? igAccount.name,
        displayName:      igAccount.name,
        avatarUrl:        igAccount.profile_picture_url,
        accessToken:      encryptToken(pageToken),
        tokenExpiresAt,
        scopes: [
          'instagram_basic',
          'instagram_content_publish',
          'pages_show_list',
          'pages_read_engagement',
        ],
      },
      update: {
        platformUserId:   igAccount.id,
        platformUsername: igAccount.username ?? igAccount.name,
        displayName:      igAccount.name,
        avatarUrl:        igAccount.profile_picture_url,
        accessToken:      encryptToken(pageToken),
        tokenExpiresAt,
        isActive:         true,
      },
    })

    return NextResponse.redirect(
      `${APP_URL}/settings?platform=instagram&success=true&username=${igAccount.username ?? igAccount.name}`
    )
  } catch (err: any) {
    console.error('[Instagram OAuth]', err)
    return NextResponse.redirect(
      `${APP_URL}/settings?platform=instagram&error=${encodeURIComponent(err.message ?? 'Unknown error')}`
    )
  }
}
