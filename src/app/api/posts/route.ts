// src/app/api/posts/route.ts
// GET /api/posts  — list posts
// POST /api/posts — create post

import { z }                              from 'zod'
import { startOfMonth }                   from 'date-fns'
import { withErrorHandler, ok, err, PLAN_LIMITS } from '@/lib/api'
import { requireWorkspace }               from '@/lib/auth/session'
import { db }                             from '@/lib/db/client'
import { schedulePost, publishNow }       from '@/lib/queue'
import type { SocialPlatform, PostMediaType } from '@prisma/client'
import { isVideoUrl }                     from '@/lib/storage/s3'

const MEDIA_TYPES = ['IMAGE', 'VIDEO', 'REEL', 'STORY', 'CAROUSEL'] as const
// Media types that require a video file. Used to sanity-check that a post
// hasn't been marked REEL/VIDEO without an actual video URL among its media
// — an easy mistake in the Studio UI (e.g. leaving mediaType on VIDEO after
// swapping in an image) that would otherwise only surface as a confusing
// Graph API error once the worker tries to publish it.
const VIDEO_MEDIA_TYPES = new Set<(typeof MEDIA_TYPES)[number]>(['VIDEO', 'REEL'])

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
    mediaUrls:      z.array(z.string().url()).default([]),
    mediaType:      z.enum(MEDIA_TYPES).default('IMAGE'),
  })).min(1),
})

export const POST = withErrorHandler(async (req) => {
  const { session, workspace } = await requireWorkspace()
  const body = createSchema.parse(await req.json())

  // ── Plan limits ──────────────────────────────────────────────────────────
  // Previously nothing enforced these — a Free-plan user could post
  // unlimited times to all 6 platforms even though pricing promises otherwise.
  const limits = PLAN_LIMITS[session.user.plan as keyof typeof PLAN_LIMITS] ?? PLAN_LIMITS.FREE

  const requestedPlatforms = new Set(body.platforms.map(p => p.platform)).size
  if (requestedPlatforms > limits.platforms) {
    return err(
      `Your plan allows up to ${limits.platforms} platform(s) per post — this request targets ${requestedPlatforms}. Upgrade to publish to more.`,
      402,
    )
  }

  if (limits.postsPerMonth !== -1) {
    const postsThisMonth = await db.post.count({
      where: { workspaceId: workspace.id, createdAt: { gte: startOfMonth(new Date()) } },
    })
    if (postsThisMonth >= limits.postsPerMonth) {
      return err(
        `You've hit your plan's ${limits.postsPerMonth} posts/month limit. Upgrade to keep publishing this month.`,
        402,
      )
    }
  }

  // Video/Reel need an actual video file among their media — catch the
  // Studio-UI mistake of leaving mediaType on VIDEO/REEL after swapping in
  // an image, before it becomes a confusing Graph API error at publish time.
  for (const p of body.platforms) {
    if (VIDEO_MEDIA_TYPES.has(p.mediaType) && !p.mediaUrls.some(isVideoUrl)) {
      return err(
        `${p.platform}: mediaType is "${p.mediaType}" but no video file was attached. Upload a video or switch the media type.`,
        422,
      )
    }
    if (p.platform === 'INSTAGRAM' && p.mediaUrls.length === 0) {
      return err('INSTAGRAM: requires at least one image or video.', 422)
    }
  }

  const scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null
  const status      = body.publishNow ? 'PUBLISHING' : scheduledAt ? 'SCHEDULED' : 'DRAFT'

  // Post-level mediaUrls/mediaType are a summary across platforms (e.g. for
  // showing a thumbnail in the content library) — the per-platform values on
  // PostPlatform are what publisher.ts actually reads when posting.
  const allMediaUrls = Array.from(new Set(body.platforms.flatMap(p => p.mediaUrls)))
  const primaryMediaType: PostMediaType = body.platforms.find(p => p.mediaUrls.length)?.mediaType ?? 'IMAGE'

  const post = await db.post.create({
    data: {
      workspaceId: workspace.id,
      title:       body.title,
      rawContent:  body.rawContent,
      tone:        body.tone,
      format:      body.format,
      language:    body.language,
      mediaUrls:   allMediaUrls,
      mediaType:   primaryMediaType,
      scheduledAt,
      status:      status as any,
      platforms: {
        create: body.platforms.map(p => ({
          platform:        p.platform as SocialPlatform,
          socialAccountId: p.socialAccountId,
          adaptedText:     p.adaptedText,
          hashtags:        p.hashtags,
          mediaUrls:       p.mediaUrls,
          mediaType:       p.mediaType as PostMediaType,
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
