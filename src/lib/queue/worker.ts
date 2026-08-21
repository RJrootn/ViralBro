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
import type { SocialPlatform } from '@prisma/client'
import { redisConnection, type PublishJobData, type AnalyticsJobData } from './index'

const connection = redisConnection

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
// Plumbing only. No platform "fetch insights" implementation exists yet
// anywhere in the codebase (the /api/analytics route only reads Analytics
// rows that already exist — nothing writes them). Designing that per
// platform is its own separate task. This just drains the queue safely
// instead of leaving jobs stuck with nothing consuming them.
export const analyticsWorker = new Worker<AnalyticsJobData>(
  'fetch-analytics',
  async (job: Job<AnalyticsJobData>) => {
    console.warn(
      `[fetch-analytics] ${job.id} — no fetch implementation yet for ` +
      `${job.data.platform}, skipping (TODO)`,
    )
  },
  { connection, concurrency: 3 },
)

console.log('Vyral queue worker started — listening on publish-post + fetch-analytics')

async function shutdown() {
  await Promise.all([publishWorker.close(), analyticsWorker.close()])
  process.exit(0)
}
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
