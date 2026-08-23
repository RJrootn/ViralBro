// src/app/api/admin/stats/route.ts
//
// RJ's own business dashboard — revenue and usage numbers, not the
// per-creator analytics every other user sees. Everything here is a real
// query against the actual tables (User, Payment, Post, AiCredit); nothing
// is estimated or hardcoded. Gated by requireAdmin (email allowlist), which
// throws 'FORBIDDEN' → 403 for anyone else, including other signed-in users.

import { subDays, startOfDay } from 'date-fns'
import { withErrorHandler, ok } from '@/lib/api'
import { requireAdmin } from '@/lib/auth/admin'
import { db } from '@/lib/db/client'

export const GET = withErrorHandler(async () => {
  await requireAdmin()

  const thirtyDaysAgo = startOfDay(subDays(new Date(), 29)) // inclusive of today = 30 days
  const sevenDaysAgo = startOfDay(subDays(new Date(), 6))

  const [
    usersByPlan,
    totalUsers,
    revenueAgg,
    revenueByPlan,
    signupsRaw,
    totalPostsPublished,
    postsLast30d,
    creditsConsumedAgg,
    activeUserIds,
    recentPayments,
  ] = await Promise.all([
    db.user.groupBy({ by: ['plan'], _count: { _all: true } }),
    db.user.count(),
    db.payment.aggregate({ where: { status: 'CAPTURED' }, _sum: { amount: true }, _count: { _all: true } }),
    db.payment.groupBy({ by: ['plan'], where: { status: 'CAPTURED' }, _sum: { amount: true }, _count: { _all: true } }),
    db.user.findMany({ where: { createdAt: { gte: thirtyDaysAgo } }, select: { createdAt: true } }),
    db.post.count({ where: { status: 'PUBLISHED' } }),
    db.post.count({ where: { status: 'PUBLISHED', publishedAt: { gte: thirtyDaysAgo } } }),
    // Ledger rows with a negative amount are usage debits (see AiCredit.amount comment in schema).
    db.aiCredit.aggregate({ where: { amount: { lt: 0 } }, _sum: { amount: true } }),
    db.post.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { workspace: { select: { userId: true } } },
      distinct: ['workspaceId'],
    }),
    db.payment.findMany({
      where: { status: 'CAPTURED' },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { amount: true, plan: true, createdAt: true, user: { select: { email: true, name: true } } },
    }),
  ])

  // Bucket signups by day for the last 30 days, including days with zero.
  const signupsByDay: Record<string, number> = {}
  for (let i = 0; i < 30; i++) {
    const day = startOfDay(subDays(new Date(), i)).toISOString().slice(0, 10)
    signupsByDay[day] = 0
  }
  for (const u of signupsRaw) {
    const day = startOfDay(u.createdAt).toISOString().slice(0, 10)
    if (day in signupsByDay) signupsByDay[day]++
  }
  const signupSeries = Object.entries(signupsByDay).sort(([a], [b]) => a.localeCompare(b))

  return ok({
    users: {
      total: totalUsers,
      byPlan: Object.fromEntries(usersByPlan.map(r => [r.plan, r._count._all])),
    },
    revenue: {
      totalPaise: revenueAgg._sum.amount ?? 0,
      paymentsCount: revenueAgg._count._all,
      byPlan: Object.fromEntries(revenueByPlan.map(r => [r.plan, { paise: r._sum.amount ?? 0, count: r._count._all }])),
      recent: recentPayments.map(p => ({
        amountPaise: p.amount, plan: p.plan, at: p.createdAt,
        user: p.user.email ?? p.user.name ?? 'Unknown',
      })),
    },
    activity: {
      totalPostsPublished,
      postsLast30d,
      aiCreditsConsumed: Math.abs(creditsConsumedAgg._sum.amount ?? 0),
      activeUsersLast7d: new Set(activeUserIds.map(p => p.workspace.userId)).size,
    },
    signupsLast30d: signupSeries.map(([date, count]) => ({ date, count })),
  })
})
