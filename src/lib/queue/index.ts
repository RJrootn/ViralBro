// src/lib/queue/index.ts
// BullMQ job queue for scheduled post publishing

import { Queue, Worker, type Job } from 'bullmq'
import IORedis from 'ioredis'

// ── Redis connection ──────────────────────────────────────────────────────
export const redis = new IORedis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null, // required for BullMQ
  enableReadyCheck:     false,
})

// ── Queue definitions ─────────────────────────────────────────────────────
export const publishQueue = new Queue('publish-post', {
  connection: redis,
  defaultJobOptions: {
    attempts:     3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { age: 7 * 24 * 3600 }, // keep 7 days
    removeOnFail:     { age: 30 * 24 * 3600 }, // keep 30 days
  },
})

export const analyticsQueue = new Queue('fetch-analytics', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 10000 },
  },
})

// ── Job types ─────────────────────────────────────────────────────────────
export interface PublishJobData {
  postId:         string
  platform:       string
  workspaceId:    string
  socialAccountId: string
}

export interface AnalyticsJobData {
  workspaceId:    string
  socialAccountId: string
  platform:       string
  sinceDate:      string // ISO date
}

// ── Schedule a post ───────────────────────────────────────────────────────
export async function schedulePost(data: PublishJobData, publishAt: Date) {
  const delay = Math.max(0, publishAt.getTime() - Date.now())
  const job = await publishQueue.add('publish', data, { delay })
  return job.id
}

// ── Schedule immediate publish ────────────────────────────────────────────
export async function publishNow(data: PublishJobData) {
  const job = await publishQueue.add('publish', data, { delay: 0 })
  return job.id
}

// ── Schedule daily analytics fetch (run via cron) ─────────────────────────
export async function scheduleAnalyticsFetch(data: AnalyticsJobData) {
  const job = await analyticsQueue.add('fetch', data)
  return job.id
}
