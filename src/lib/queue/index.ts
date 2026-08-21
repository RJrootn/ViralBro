import { Queue } from 'bullmq'

// NOTE: this reads a single REDIS_URL (see .env.example), not REDIS_HOST/REDIS_PORT.
// Hosted Redis (Upstash, Railway) embeds auth + TLS scheme in the URL itself
// — e.g. rediss://default:TOKEN@host.upstash.io:6379 — so splitting it into
// separate host/port fields silently drops the password and TLS flag.
//
// This is a plain options object, not a live ioredis instance, on purpose:
// BullMQ bundles its own internal copy of ioredis, which TypeScript treats
// as a different type from the top-level ioredis package even when the
// runtime versions match. Handing BullMQ a config object (which it uses to
// build its own client) sidesteps that cross-package type conflict — an
// earlier version of this file passed a `new IORedis(...)` instance here
// and failed `tsc`. maxRetriesPerRequest: null is required by BullMQ.
function parseRedisConnection(url: string) {
  const u = new URL(url)
  return {
    host: u.hostname,
    port: Number(u.port || 6379),
    username: u.username || undefined,
    password: u.password || undefined,
    tls: u.protocol === 'rediss:' ? {} : undefined,
    maxRetriesPerRequest: null as null,
  }
}

export const redisConnection = parseRedisConnection(
  process.env.REDIS_URL ?? 'redis://localhost:6379',
)
const connection = redisConnection

export const publishQueue = new Queue('publish-post', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { age: 7 * 24 * 3600 },
    removeOnFail: { age: 30 * 24 * 3600 },
  },
})

export const analyticsQueue = new Queue('fetch-analytics', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 10000 },
  },
})

export interface PublishJobData {
  postId: string
  platform: string
  workspaceId: string
  socialAccountId: string
}

export interface AnalyticsJobData {
  postId: string
  postPlatformId: string
  workspaceId: string
  socialAccountId: string
  platform: string
}

export async function schedulePost(data: PublishJobData, publishAt: Date) {
  const delay = Math.max(0, publishAt.getTime() - Date.now())
  const job = await publishQueue.add('publish', data, { delay })
  return job.id
}

export async function publishNow(data: PublishJobData) {
  const job = await publishQueue.add('publish', data, { delay: 0 })
  return job.id
}

export async function scheduleAnalyticsFetch(data: AnalyticsJobData, delayMs = 0) {
  const job = await analyticsQueue.add('fetch', data, { delay: delayMs })
  return job.id
}
