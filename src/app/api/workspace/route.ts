// src/app/api/workspace/route.ts
//
// GET /api/workspace — the current user's workspace name/plan, used by the
// Dashboard header's workspace badge. This is NOT a "switch team" endpoint —
// there's no multi-workspace or multi-user support yet (Workspace.userId is
// @unique, see prisma/schema.prisma) — it exists so the header can show the
// real workspace name instead of the old "This Team ▾" button, which was a
// dead click styled like a team-switcher dropdown when no such feature
// exists.

import { withErrorHandler, ok } from '@/lib/api'
import { requireWorkspace }     from '@/lib/auth/session'

export const GET = withErrorHandler(async () => {
  const { workspace, session } = await requireWorkspace()
  return ok({ id: workspace.id, name: workspace.name, plan: session.user.plan })
})
