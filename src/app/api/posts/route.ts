// src/app/api/posts/route.ts
// GET /api/posts  — list posts
// POST /api/posts — create post

import { z }                          from 'zod'
import { withErrorHandler, ok }       from '@/lib/api'
import { requireWorkspace }           from '@/lib/auth/session'
import { db }                         from '@/lib/db/client'
import { schedulePost, publishNow }   from '@/lib/queue'
import type { SocialPlatform }        from '@prisma/client'

// ── GET: list posts ───────────────────────────────────────────────────────
export const GET = withErrorHandler(async (req) => {
  const { workspace } = await requireWorkspace()
  const { searchParams } = new URL(req.url)

  const status = searchParams.get('status') ?? undefined
  const page   = parseInt(searchParams.get('page') ?? '1')
  const limit  = Math.min(parseInt(searchParams.get('limit') ?? '20'), 100)
  const skip   = (page - 1) * limit

  const [posts, total] = await Promise.all([
    db.post.findMany({
      where: {
        workspaceId: workspace.id,
        ...(status ? { status: status as any } : {}),
      },
      include: {
        platforms: {
          include: { socialAccount: { select: { platform: true, platformUsername: true } } }
        },
        analytics: {
          orderBy: { date: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    db.post.count({ where: { workspaceId: workspace.id } }),
  ])

  return ok({ posts, total, page, limit, pages: Math.ceil(total / limit) })
})

// ── POST: create post ─────────────────────────────────────────────────────
const createSchema = z.object({
  title:       z.string().optional(),
  rawContent:  z.string().min(1).max(5000),
  tone:        z.string().default('authentic'),
  format:      z.string().default('listicle'),
  language:    z.string().default('en'),
  scheduledAt: z.string().datetime().optional(),
  publishNow:  z.boolean().default(false),
  platforms: z.array(z.object({
    platform:       z.enum(['INSTAGRAM','TWITTER','LINKEDIN','YOUTUBE','FACEBOOK','WHATSAPP']),
    socialAccountId: z.string(),
    adaptedText:    z.string(),
    hashtags:       z.array(z.string()).default([]),
  })).min(1),
})

export const POST = withErrorHandler(async (req) => {
  const { workspace } = await requireWorkspace()
  const body = createSchema.parse(await req.json())

  const scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null
  const status      = body.publishNow ? 'PUBLISHING' : scheduledAt ? 'SCHEDULED' : 'DRAFT'

  const post = await db.post.create({
    data: {
      workspaceId: workspace.id,
      title:       body.title,
      rawContent:  body.rawContent,
      tone:        body.tone,
      format:      body.format,
      language:    body.language,
      scheduledAt,
      status:      status as any,
      platforms: {
        create: body.platforms.map(p => ({
          platform:        p.platform as SocialPlatform,
          socialAccountId: p.socialAccountId,
          adaptedText:     p.adaptedText,
          hashtags:        p.hashtags,
          status:          status as any,
        })),
      },
    },
    include: { platforms: true },
  })

  // Enqueue jobs
  for (const pp of post.platforms) {
    const jobData = {
      postId:          post.id,
      platform:        pp.platform,
      workspaceId:     workspace.id,
      socialAccountId: pp.socialAccountId,
    }
    if (body.publishNow) {
      await publishNow(jobData)
    } else if (scheduledAt) {
      await schedulePost(jobData, scheduledAt)
    }
  }

  return ok({ post }, 201)
})
