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
export const PLAN_LIMITS = {
  FREE:    { postsPerMonth: 10,  aiCredits: 50,   platforms: 2, teamMembers: 1 },
  CREATOR: { postsPerMonth: 100, aiCredits: 500,  platforms: 4, teamMembers: 1 },
  PRO:     { postsPerMonth: 500, aiCredits: 2000, platforms: 6, teamMembers: 3 },
  AGENCY:  { postsPerMonth: -1,  aiCredits: 5000, platforms: 6, teamMembers: 10 },
} as const
