// src/app/api/platforms/twitter/route.ts
// Twitter uses OAuth 2.0 with PKCE (no client secret exposed to browser)
//
// Flow:
//  Browser → GET /api/platforms/twitter
//    → generates code_verifier, code_challenge, state
//    → stores verifier in Redis/session
//    → redirects to twitter.com/i/oauth2/authorize
//  Twitter → GET /api/platforms/twitter/callback?code=...&state=...
//    → exchanges code + verifier for tokens
//    → fetches Twitter profile
//    → saves to DB

import { NextResponse }         from 'next/server'
import { cookies }              from 'next/headers'
import { requireWorkspace }     from '@/lib/auth/session'
import {
  generateOAuthState,
  generateCodeVerifier,
  generateCodeChallenge,
} from '@/lib/tokens/encrypt'

// See instagram/route.ts — requireWorkspace() reads cookies but Next can't
// detect that through the import, so without this the build tries to
// prerender this route statically and fails.
export const dynamic = 'force-dynamic'

const TWITTER_CLIENT_ID = process.env.TWITTER_CLIENT_ID!
const APP_URL           = process.env.NEXT_PUBLIC_APP_URL!
const CALLBACK_URL      = `${APP_URL}/api/platforms/twitter/callback`

const SCOPES = [
  'tweet.read',
  'tweet.write',
  'users.read',
  'offline.access',
  // Required for the v2 chunked media upload endpoint (see
  // uploadTwitterMedia in src/lib/social/publisher.ts) — without this,
  // POST /2/media/upload returns 403 even though tweet.write alone is
  // enough to post text-only tweets. Accounts connected before this scope
  // was added won't have it on their existing token; they need to
  // disconnect and reconnect Twitter once for media uploads to work.
  'media.write',
].join(' ')

export async function GET() {
  try {
    const { workspace } = await requireWorkspace()

    // Generate PKCE pair
    const codeVerifier  = generateCodeVerifier()
    const codeChallenge = generateCodeChallenge(codeVerifier)
    const state         = generateOAuthState(workspace.id)

    // Store verifier in a short-lived cookie (10 min TTL)
    // In production, use Redis with state as key
    const cookieStore = cookies()
    cookieStore.set('twitter_code_verifier', codeVerifier, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge:   600, // 10 minutes
      path:     '/',
    })
    cookieStore.set('twitter_oauth_state', state, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge:   600,
      path:     '/',
    })

    const url = new URL('https://twitter.com/i/oauth2/authorize')
    url.searchParams.set('response_type',          'code')
    url.searchParams.set('client_id',              TWITTER_CLIENT_ID)
    url.searchParams.set('redirect_uri',           CALLBACK_URL)
    url.searchParams.set('scope',                  SCOPES)
    url.searchParams.set('state',                  state)
    url.searchParams.set('code_challenge',         codeChallenge)
    url.searchParams.set('code_challenge_method',  'S256')

    return NextResponse.redirect(url.toString())
  } catch {
    return NextResponse.redirect(`${APP_URL}/settings?error=auth_required`)
  }
}
