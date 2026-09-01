// src/app/api/platforms/instagram/route.ts
// GET /api/platforms/instagram          → redirect to Meta OAuth
// GET /api/platforms/instagram/callback → handle Meta callback

// ─────────────────────────────────────────────────────────────────────────
// INITIATE  (GET /api/platforms/instagram)
// ─────────────────────────────────────────────────────────────────────────
import { NextResponse }       from 'next/server'
import { cookies }            from 'next/headers'
import { requireWorkspace }   from '@/lib/auth/session'
import { generateOAuthState } from '@/lib/tokens/encrypt'

// This route calls getServerSession() (via requireWorkspace), which reads
// cookies — but Next.js's static-analysis doesn't see through that call, so
// without this it tries to prerender the route at BUILD time with no
// request/cookies available, throws, and fails the whole `next build`.
export const dynamic = 'force-dynamic'

const META_APP_ID     = process.env.META_APP_ID!
const APP_URL         = process.env.NEXT_PUBLIC_APP_URL!
const CALLBACK_URL    = `${APP_URL}/api/platforms/instagram/callback`

// Meta's OAuth dialog rejects the whole request with "Invalid Scopes" if any
// listed scope hasn't been added to this app in App Review > Permissions and
// Features. `pages_manage_posts` (posting to a Page's own feed) and
// `instagram_manage_insights` (analytics) aren't called anywhere in this
// codebase yet (publisher.ts only hits /media + /media_publish, which needs
// instagram_basic + instagram_content_publish + pages_show_list +
// pages_read_engagement to resolve the linked IG business account) — so they
// were dropped rather than guessed-fixed. Add them back once they're
// actually consumed by a feature AND added to the app in the dashboard.
const SCOPES = [
  'instagram_basic',
  'instagram_content_publish',
  'pages_show_list',
  'pages_read_engagement',
].join(',')

export async function GET(req: Request) {
  try {
    const { workspace } = await requireWorkspace()
    const state = generateOAuthState(workspace.id)

    // CSRF check: bind this state to the browser that started the flow, the
    // same way twitter/route.ts and linkedin/route.ts already do — without
    // this, the callback has no way to tell a legitimate redirect from Meta
    // apart from a forged `state` pointing at someone else's workspace.
    cookies().set('instagram_oauth_state', state, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge:   600, // 10 minutes
      path:     '/',
    })

    const url = new URL('https://www.facebook.com/v19.0/dialog/oauth')
    url.searchParams.set('client_id',     META_APP_ID)
    url.searchParams.set('redirect_uri',  CALLBACK_URL)
    url.searchParams.set('scope',         SCOPES)
    url.searchParams.set('state',         state)
    url.searchParams.set('response_type', 'code')

    return NextResponse.redirect(url.toString())
  } catch {
    return NextResponse.redirect(`${APP_URL}/settings?error=auth_required`)
  }
}
