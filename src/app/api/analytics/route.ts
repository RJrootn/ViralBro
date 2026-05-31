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
  const daily = await db.analytics.groupBy({
    by:    ['date'],
    where: { workspaceId: workspace.id, date: { gte: since } },
    _sum:  { reach: true, engagements: true },
    orderBy: { date: 'asc' },
  } as any)

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
