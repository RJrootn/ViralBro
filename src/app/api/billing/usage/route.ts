// src/app/api/billing/usage/route.ts
//
// Powers the sidebar usage meter and the Billing tab in Settings — the
// current plan's real limits alongside this month's actual usage, read
// from the same tables /api/posts and /api/ai/generate already enforce
// limits against. No separate "usage" table to keep in sync; this just
// reads the same source of truth those routes already check.

import { startOfMonth } from 'date-fns'
import { withErrorHandler, ok, PLAN_LIMITS } from '@/lib/api'
import { requireWorkspace } from '@/lib/auth/session'
import { db } from '@/lib/db/client'

export const GET = withErrorHandler(async () => {
  const { session, workspace } = await requireWorkspace()

  const plan = (session.user.plan as keyof typeof PLAN_LIMITS) ?? 'FREE'
  const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.FREE

  const [postsThisMonth, user] = await Promise.all([
    db.post.count({
      where: { workspaceId: workspace.id, createdAt: { gte: startOfMonth(new Date()) } },
    }),
    db.user.findUnique({
      where: { id: session.user.id },
      select: { aiCreditBalance: true, planExpiresAt: true },
    }),
  ])

  return ok({
    plan,
    planExpiresAt: user?.planExpiresAt ?? null,
    limits,
    usage: {
      postsThisMonth,
      aiCreditBalance: user?.aiCreditBalance ?? 0,
    },
  })
})
