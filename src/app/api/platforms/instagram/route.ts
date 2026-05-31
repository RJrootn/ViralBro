// src/app/api/platforms/instagram/route.ts
// GET /api/platforms/instagram          → redirect to Meta OAuth
// GET /api/platforms/instagram/callback → handle Meta callback

// ─────────────────────────────────────────────────────────────────────────
// INITIATE  (GET /api/platforms/instagram)
// ─────────────────────────────────────────────────────────────────────────
import { NextResponse }       from 'next/server'
import { requireWorkspace }   from '@/lib/auth/session'
import { generateOAuthState } from '@/lib/tokens/encrypt'

const META_APP_ID     = process.env.META_APP_ID!
const APP_URL         = process.env.NEXT_PUBLIC_APP_URL!
const CALLBACK_URL    = `${APP_URL}/api/platforms/instagram/callback`

const SCOPES = [
  'instagram_basic',
  'instagram_content_publish',
  'instagram_manage_insights',
  'pages_read_engagement',
  'pages_manage_posts',
  'pages_show_list',
].join(',')

export async function GET(req: Request) {
  try {
    const { workspace } = await requireWorkspace()
    const state = generateOAuthState(workspace.id)

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
