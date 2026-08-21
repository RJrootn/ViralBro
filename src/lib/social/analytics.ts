// src/lib/social/analytics.ts
//
// Actually writes to the Analytics table. Before this file existed,
// analyticsWorker in worker.ts was plumbing-only — it drained the
// fetch-analytics queue but never called any platform's API or wrote a
// single row, so /api/analytics (which is fully built) had nothing to
// aggregate, and the Dashboard's metric cards stayed permanently fake,
// hidden behind the "Sample data" banner.
//
// Scope: Instagram only for now, matching the one platform we've actually
// proven end-to-end (publish + real post visible on Instagram). Twitter/
// LinkedIn/YouTube/Facebook/WhatsApp insights are their own separate API
// shapes and auth scopes — adding them is follow-up work, not guessed at
// here. Calling fetchAnalyticsFor with any other platform is a deliberate
// no-op (see worker.ts), same honesty pattern as the rest of this codebase.
//
// Caveat worth flagging: the exact set of metrics the Graph API accepts on
// /{media-id}/insights has changed across API versions (e.g. `impressions`
// was deprecated for media created after Oct 2023 on some accounts), and
// this hasn't been exercised against a live Meta response yet. If Meta
// rejects a metric name, the whole insights call fails — that's a safe
// failure (no row gets written, existing "sample data" state persists) —
// but it means the metric list below may need adjusting once real
// responses come back. rawData is stored on every successful fetch
// specifically so this can be re-processed without re-hitting the API.

import { db }             from '@/lib/db/client'
import { getValidToken }  from '@/lib/tokens/refresh'
import type { PostMediaType } from '@prisma/client'

interface FetchAnalyticsInput {
  postId:         string
  postPlatformId: string
  workspaceId:    string
  socialAccountId: string
}

// Feed image/carousel posts and Reels/video expose different metric sets on
// the Graph API — a single shared list would get the whole call rejected if
// any one metric doesn't apply to that media type.
function metricsFor(mediaType: PostMediaType): string[] {
  switch (mediaType) {
    case 'VIDEO':
    case 'REEL':
      return ['reach', 'likes', 'comments', 'saved', 'shares', 'plays']
    case 'STORY':
      return ['reach', 'replies', 'exits', 'taps_forward', 'taps_back']
    case 'CAROUSEL':
    case 'IMAGE':
    default:
      return ['reach', 'likes', 'comments', 'saved', 'shares']
  }
}

// Narrower set to retry with if the full list gets rejected — `reach` is the
// one metric documented as available across every media type/API version,
// so this degrades to "at least get reach" rather than nothing at all.
const FALLBACK_METRICS = ['reach']

async function igInsightsFetch(mediaId: string, metrics: string[], token: string) {
  const url = new URL(`https://graph.facebook.com/v19.0/${mediaId}/insights`)
  url.searchParams.set('metric', metrics.join(','))
  url.searchParams.set('access_token', token)
  const res  = await fetch(url.toString())
  const data = await res.json()
  if (data.error) throw new Error(data.error.message)
  return data.data as Array<{ name: string; values: Array<{ value: number }> }>
}

function metricValue(rows: Array<{ name: string; values: Array<{ value: number }> }>, name: string): number {
  const row = rows.find(r => r.name === name)
  return row?.values?.[0]?.value ?? 0
}

export async function fetchInstagramInsights({
  postId, postPlatformId, workspaceId, socialAccountId,
}: FetchAnalyticsInput): Promise<void> {
  const postPlatform = await db.postPlatform.findUnique({
    where: { id: postPlatformId },
    select: { platformPostId: true, mediaType: true, status: true },
  })

  if (!postPlatform?.platformPostId || postPlatform.status !== 'PUBLISHED') {
    // Nothing published yet (or it failed) — there's no media ID to fetch
    // insights for. Not an error, just nothing to do.
    return
  }

  const token = await getValidToken(socialAccountId)
  const wanted = metricsFor(postPlatform.mediaType)

  let rows: Array<{ name: string; values: Array<{ value: number }> }>
  try {
    rows = await igInsightsFetch(postPlatform.platformPostId, wanted, token)
  } catch (e) {
    console.warn(
      `[analytics] full metric set rejected for ${postPlatform.platformPostId} (${e instanceof Error ? e.message : e}), retrying with reach only`,
    )
    rows = await igInsightsFetch(postPlatform.platformPostId, FALLBACK_METRICS, token)
  }

  const reach    = metricValue(rows, 'reach')
  const likes    = metricValue(rows, 'likes')
  const comments = metricValue(rows, 'comments')
  const shares   = metricValue(rows, 'shares')
  const saves    = metricValue(rows, 'saved')
  const videoViews = metricValue(rows, 'plays')
  const engagements = likes + comments + shares + saves
  const engagementRate = reach > 0 ? engagements / reach : 0

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  await db.analytics.upsert({
    where: {
      workspaceId_postPlatformId_date: { workspaceId, postPlatformId, date: today },
    },
    create: {
      workspaceId, postId, postPlatformId,
      platform: 'INSTAGRAM',
      date: today,
      reach, likes, comments, shares, saves,
      videoViews, engagementRate,
      rawData: rows as any,
    },
    update: {
      reach, likes, comments, shares, saves,
      videoViews, engagementRate,
      rawData: rows as any,
      fetchedAt: new Date(),
    },
  })
}
