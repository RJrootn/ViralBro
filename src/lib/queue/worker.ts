// src/lib/queue/worker.ts
//
// Long-running BullMQ worker process. Run it as its OWN always-on process,
// separate from the Next.js app — e.g. `npm run worker` on a Railway
// "Worker" service or a small VPS. It cannot run on Netlify Functions (or
// any request-scoped serverless host): those spin down between requests,
// and this needs to sit and consume jobs continuously.

import { Worker, Job } from 'bullmq'
import { db } from '@/lib/db/client'
import { publishToplatform } from '@/lib/social/publisher'
import { fetchInstagramInsights } from '@/lib/social/analytics'
import type { SocialPlatform } from '@prisma/client'
import { redisConnection, scheduleAnalyticsFetch, type PublishJobData, type AnalyticsJobData } from './index'

const connection = redisConnection

// First fetch is deliberately delayed — Instagram's Insights API doesn't
// have numbers to report the instant a post goes live, and a same-second
// fetch would just record zeros. A second fetch a day later catches reach/
// engagement that accumulates after the initial burst.
const ANALYTICS_FIRST_FETCH_DELAY_MS = 20 * 60 * 1000       // 20 minutes
const ANALYTICS_FOLLOWUP_FETCH_DELAY_MS = 24 * 60 * 60 * 1000 // 24 hours

// ── Roll the parent Post's status up from its PostPlatform children ───────
// PostStatus has no PARTIAL state, so: all children published -> PUBLISHED;
// any child still in flight -> PUBLISHING; all terminal with a failure among
// them -> FAILED. Good enough for now; revisit if partial-success needs its
// own status later.
async function recomputePostStatus(postId: string) {
  const children = await db.postPlatform.findMany({
    where: { postId },
    select: { status: true },
  })
  if (children.length === 0) return

  const status = children.every((c) => c.status === 'PUBLISHED')
    ? 'PUBLISHED'
    : children.some((c) => c.status === 'PUBLISHING' || c.status === 'SCHEDULED')
      ? 'PUBLISHING'
      : 'FAILED'

  await db.post.update({
    where: { id: postId },
    data: {
      status,
      publishedAt: status === 'PUBLISHED' ? new Date() : undefined,
    },
  })
}

// ── Publish worker ──────────────────────────────────────────────────────
export const publishWorker = new Worker<PublishJobData>(
  'publish-post',
  async (job: Job<PublishJobData>) => {
    const { postId, socialAccountId } = job.data
    const platform = job.data.platform as SocialPlatform

    const postPlatform = await db.postPlatform.findUnique({
      where: { postId_platform: { postId, platform } },
    })
    if (!postPlatform) {
      throw new Error(`PostPlatform not found for post ${postId} / ${platform}`)
    }

    await db.postPlatform.update({
      where: { id: postPlatform.id },
      data: { status: 'PUBLISHING' },
    })
    await recomputePostStatus(postId)

    const result = await publishToplatform(
      socialAccountId,
      platform,
      postPlatform.adaptedText,
      postPlatform.hashtags,
      postPlatform.mediaUrls,
      postPlatform.mediaType,
    )

    if (!result.success) {
      // Record what happened on this attempt, then throw so BullMQ retries
      // it (the queue is configured for 3 attempts, exponential backoff).
      await db.postPlatform.update({
        where: { id: postPlatform.id },
        data: { errorMessage: result.error ?? 'Unknown publish error' },
      })
      throw new Error(result.error ?? 'Unknown publish error')
    }

    await db.postPlatform.update({
      where: { id: postPlatform.id },
      data: {
        status: 'PUBLISHED',
        platformPostId: result.platformPostId,
        publishedAt: new Date(),
        errorMessage: null,
      },
    })
    await recomputePostStatus(postId)

    // Only Instagram insights fetching is implemented (see analytics.ts) —
    // scheduling a fetch for another platform would just sit in the queue
    // forever with the analyticsWorker's no-op warning below. Scoping the
    // schedule call itself to INSTAGRAM keeps that honest instead of
    // silently queuing work nothing will do.
    if (platform === 'INSTAGRAM') {
      const analyticsJob = {
        postId,
        postPlatformId: postPlatform.id,
        workspaceId:    job.data.workspaceId,
        socialAccountId,
        platform,
      }
      await scheduleAnalyticsFetch(analyticsJob, ANALYTICS_FIRST_FETCH_DELAY_MS)
      await scheduleAnalyticsFetch(analyticsJob, ANALYTICS_FOLLOWUP_FETCH_DELAY_MS)
    }

    return result
  },
  { connection, concurrency: 5 },
)

publishWorker.on('completed', (job) => {
  console.log(`[publish-post] ${job.id} done — post ${job.data.postId} / ${job.data.platform}`)
})

publishWorker.on('failed', async (job, err) => {
  if (!job) return
  console.error(
    `[publish-post] ${job.id} attempt ${job.attemptsMade} failed — ` +
    `post ${job.data.postId} / ${job.data.platform}: ${err.message}`,
  )

  // BullMQ fires 'failed' after every attempt, not just the last one — only
  // mark the row permanently FAILED once retries are exhausted.
  const maxAttempts = job.opts.attempts ?? 1
  if (job.attemptsMade >= maxAttempts) {
    const { postId, platform } = job.data
    await db.postPlatform.updateMany({
      where: { postId, platform: platform as SocialPlatform },
      data: { status: 'FAILED', errorMessage: err.message },
    })
    await recomputePostStatus(postId)
  }
})

// ── Analytics worker ────────────────────────────────────────────────────
// Instagram is implemented (see analytics.ts) — publishWorker above
// schedules a fetch here automatically 20 minutes and 24 hours after a
// successful Instagram publish. Every other platform is still a
// deliberate no-op: their insights APIs have different auth scopes and
// response shapes that haven't been built yet, and pretending to fetch
// them would either error out unpredictably or (worse) silently write
// zeros that look like real data.
export const analyticsWorker = new Worker<AnalyticsJobData>(
  'fetch-analytics',
  async (job: Job<AnalyticsJobData>) => {
    if (job.data.platform !== 'INSTAGRAM') {
      console.warn(
        `[fetch-analytics] ${job.id} — no fetch implementation yet for ` +
        `${job.data.platform}, skipping (TODO)`,
      )
      return
    }
    await fetchInstagramInsights(job.data)
  },
  { connection, concurrency: 3 },
)

analyticsWorker.on('completed', (job) => {
  console.log(`[fetch-analytics] ${job.id} done — post ${job.data.postId} / ${job.data.platform}`)
})

analyticsWorker.on('failed', (job, err) => {
  if (!job) return
  console.error(
    `[fetch-analytics] ${job.id} attempt ${job.attemptsMade} failed — ` +
    `post ${job.data.postId} / ${job.data.platform}: ${err.message}`,
  )
})

console.log('Vyral queue worker started — listening on publish-post + fetch-analytics')

async function shutdown() {
  await Promise.all([publishWorker.close(), analyticsWorker.close()])
  process.exit(0)
}
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
