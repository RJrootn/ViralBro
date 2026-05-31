import { Queue } from 'bullmq'

const connection = {
  host: process.env.REDIS_HOST ?? 'localhost',
  port: parseInt(process.env.REDIS_PORT ?? '6379'),
}

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
  workspaceId: string
  socialAccountId: string
  platform: string
  sinceDate: string
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

export async function scheduleAnalyticsFetch(data: AnalyticsJobData) {
  const job = await analyticsQueue.add('fetch', data)
  return job.id
}
