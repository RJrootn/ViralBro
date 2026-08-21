// src/app/api/platforms/linkedin/route.ts
// LinkedIn OAuth 2.0 (standard authorization code flow)
//
// Flow:
//  GET /api/platforms/linkedin → redirect to LinkedIn
//  GET /api/platforms/linkedin/callback → exchange code, fetch profile, save DB

import { NextResponse }       from 'next/server'
import { requireWorkspace }   from '@/lib/auth/session'
import { generateOAuthState } from '@/lib/tokens/encrypt'

// See instagram/route.ts — requireWorkspace() reads cookies but Next can't
// detect that through the import, so without this the build tries to
// prerender this route statically and fails.
export const dynamic = 'force-dynamic'

const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID!
const APP_URL            = process.env.NEXT_PUBLIC_APP_URL!
const CALLBACK_URL       = `${APP_URL}/api/platforms/linkedin/callback`

// Required scopes for posting + profile read
const SCOPES = [
  'r_liteprofile',
  'r_emailaddress',
  'w_member_social',
].join(' ')

export async function GET() {
  try {
    const { workspace } = await requireWorkspace()
    const state = generateOAuthState(workspace.id)

    const url = new URL('https://www.linkedin.com/oauth/v2/authorization')
    url.searchParams.set('response_type', 'code')
    url.searchParams.set('client_id',     LINKEDIN_CLIENT_ID)
    url.searchParams.set('redirect_uri',  CALLBACK_URL)
    url.searchParams.set('scope',         SCOPES)
    url.searchParams.set('state',         state)

    // Store state in a cookie for CSRF validation
    const res = NextResponse.redirect(url.toString())
    res.cookies.set('linkedin_oauth_state', state, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge:   600,
      path:     '/',
    })
    return res
  } catch {
    return NextResponse.redirect(`${APP_URL}/settings?error=auth_required`)
  }
}
