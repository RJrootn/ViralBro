// src/lib/api.ts
// Shared API route utilities

import { NextResponse }  from 'next/server'
import { ZodError }      from 'zod'

// ── Standard response shape ───────────────────────────────────────────────
export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status })
}

export function err(message: string, status = 400, details?: unknown) {
  return NextResponse.json(
    { success: false, error: message, ...(details ? { details } : {}) },
    { status }
  )
}

// ── Route error handler wrapper ───────────────────────────────────────────
export function withErrorHandler(
  handler: (req: Request, ctx?: unknown) => Promise<NextResponse>
) {
  return async (req: Request, ctx?: unknown) => {
    try {
      return await handler(req, ctx)
    } catch (e) {
      if (e instanceof ZodError) {
        return err('Validation error', 422, e.flatten())
      }
      if (e instanceof Error) {
        if (e.message === 'UNAUTHORIZED')      return err('Unauthorized', 401)
        if (e.message === 'WORKSPACE_NOT_FOUND') return err('Workspace not found', 404)
        if (e.message === 'NOT_FOUND')         return err('Not found', 404)
        if (e.message === 'FORBIDDEN')         return err('Forbidden', 403)
        // Log unexpected errors
        console.error('[API Error]', e)
        return err(
          process.env.NODE_ENV === 'development' ? e.message : 'Internal server error',
          500
        )
      }
      return err('Internal server error', 500)
    }
  }
}

// ── Plan limits ───────────────────────────────────────────────────────────
// Pricing/limits finalized 2026-08-23 after a unit-economics review (see
// project doc "vyralbro-pricing-unit-economics-2026-08-23"). Two deliberate
// design choices worth remembering if these ever get revisited:
// - CREATOR's 400 credits comfortably covers its 100-post x 3-platform max
//   (300 credits) — credits are not the binding constraint on this tier.
// - PRO's 2,000 credits do NOT cover its 500-post x 5-platform max (2,500
//   credits) — this is intentional. A Pro user posting to all 5 platforms
//   every time tops out around ~400 posts/month, not 500. That gap is the
//   deliberate upsell hook toward the Top1% Club plan, not a bug.
export const PLAN_LIMITS = {
  FREE:    { postsPerMonth: 3,   aiCredits: 25,   platforms: 1, teamMembers: 1 },
  CREATOR: { postsPerMonth: 100, aiCredits: 400,  platforms: 3, teamMembers: 1 },
  PRO:     { postsPerMonth: 500, aiCredits: 2000, platforms: 5, teamMembers: 1 },
  AGENCY:  { postsPerMonth: -1,  aiCredits: 5000, platforms: 6, teamMembers: 10 },
} as const
