// src/app/api/posts/[id]/route.ts
//
// GET    /api/posts/[id] — single post with full per-platform detail
//                          (adaptedText, hashtags, errorMessage — already
//                          returned by the list endpoint's `include`, this
//                          just gives the Content Library's detail view a
//                          direct, cheaper fetch for one post).
// DELETE /api/posts/[id] — permanently remove a post.
//
// PostPlatform rows cascade-delete via the schema's onDelete: Cascade on
// Post → PostPlatform. Analytics rows do NOT cascade (no onDelete set on
// Analytics.post / Analytics.postPlatform), so deleting a post that already
// has analytics rows would otherwise fail on the foreign-key constraint —
// we clear those first, in the same transaction, before deleting the post.
//
// This does not delete the underlying media files in S3. Removing those
// too would risk deleting something still referenced elsewhere (e.g. the
// same image reused across posts) for very little benefit — an orphaned
// object in the uploads/ prefix is harmless and cheap to leave behind.

import { withErrorHandler, ok, err } from '@/lib/api'
import { requireWorkspace }          from '@/lib/auth/session'
import { db }                        from '@/lib/db/client'

export const GET = withErrorHandler(async (_req, ctx) => {
  const { workspace } = await requireWorkspace()
  const { id: postId } = (ctx as { params: { id: string } }).params

  const post = await db.post.findFirst({
    where: { id: postId, workspaceId: workspace.id },
    include: {
      platforms: {
        include: { socialAccount: { select: { platform: true, platformUsername: true } } },
      },
    },
  })
  if (!post) return err('Post not found', 404)

  return ok({ post })
})

export const DELETE = withErrorHandler(async (_req, ctx) => {
  const { workspace } = await requireWorkspace()
  const { id: postId } = (ctx as { params: { id: string } }).params

  const post = await db.post.findFirst({
    where: { id: postId, workspaceId: workspace.id },
    select: { id: true, platforms: { select: { id: true } } },
  })
  if (!post) return err('Post not found', 404)

  await db.$transaction([
    db.analytics.deleteMany({
      where: {
        OR: [
          { postId: post.id },
          { postPlatformId: { in: post.platforms.map((p: { id: string }) => p.id) } },
        ],
      },
    }),
    db.post.delete({ where: { id: post.id } }),
  ])

  return ok({ deleted: true })
})
