export const dynamic = "force-dynamic"
// src/app/api/analytics/route.ts
// GET /api/analytics — aggregated analytics for the workspace

import { withErrorHandler, ok } from '@/lib/api'
import { requireWorkspace }     from '@/lib/auth/session'
import { db }                   from '@/lib/db/client'
import { subDays, startOfDay }  from 'date-fns'

export const GET = withErrorHandler(async (req) => {
  const { workspace } = await requireWorkspace()
  const { searchParams } = new URL(req.url)
  const days = Math.min(parseInt(searchParams.get('days') ?? '7'), 90)
  const since = startOfDay(subDays(new Date(), days))

  // Overall totals
  const totals = await db.analytics.aggregate({
    where: { workspaceId: workspace.id, date: { gte: since } },
    _sum: {
      reach: true, impressions: true, likes: true,
      comments: true, shares: true, saves: true, clicks: true,
    },
    _avg: { engagementRate: true },
  })

  // Daily breakdown for chart
  // NOTE: there is no `engagements` field on Analytics (only the individual
  // likes/comments/shares/saves counts and a pre-computed engagementRate) —
  // the previous version of this query asked Prisma to sum a field that
  // doesn't exist, which throws at request time. Sum the real fields and
  // derive a per-day engagement total in code instead.
  const dailyRaw = await db.analytics.groupBy({
    by:    ['date'],
    where: { workspaceId: workspace.id, date: { gte: since } },
    _sum:  { reach: true, likes: true, comments: true, shares: true, saves: true },
    orderBy: { date: 'asc' },
  })
  const daily = dailyRaw.map(d => ({
    date: d.date,
    reach: d._sum.reach ?? 0,
    engagements: (d._sum.likes ?? 0) + (d._sum.comments ?? 0) + (d._sum.shares ?? 0) + (d._sum.saves ?? 0),
  }))

  // Per-platform breakdown
  const byPlatform = await db.analytics.groupBy({
    by:    ['platform'],
    where: { workspaceId: workspace.id, date: { gte: since } },
    _sum:  { reach: true, likes: true, comments: true, shares: true },
    _avg:  { engagementRate: true },
  })

  // Top posts
  const topPosts = await db.post.findMany({
    where: {
      workspaceId: workspace.id,
      status:      'PUBLISHED',
      publishedAt: { gte: since },
    },
    include: {
      analytics: {
        orderBy: { date: 'desc' },
        take: 1,
      },
      platforms: { select: { platform: true } },
    },
    orderBy: { analytics: { _count: 'desc' } },
    take: 10,
  })

  // Post count
  const postCount = await db.post.count({
    where: { workspaceId: workspace.id, status: 'PUBLISHED', publishedAt: { gte: since } },
  })

  return ok({
    period: { days, since: since.toISOString() },
    totals: totals._sum,
    avgEngagementRate: totals._avg.engagementRate ?? 0,
    daily,
    byPlatform,
    topPosts,
    postCount,
  })
})

