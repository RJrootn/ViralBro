// src/app/api/posts/[id]/retry/route.ts
// POST /api/posts/[id]/retry — re-enqueue only the FAILED PostPlatform rows
// on a post for publish, without touching AI generation.
//
// Why per-platform, not per-post: a post can be targeted at multiple
// platforms (e.g. Instagram + Twitter) and only one of them may have failed
// (the observed real-world failures so far have all been publish
// infrastructure/timing issues, e.g. Instagram's "Media ID is not
// available" — not bad generated text). Regenerating adaptedText for a
// platform that already published fine, or that never failed, would waste
// AI credits for no reason, so this route resets status/errorMessage only
// on rows currently FAILED and leaves adaptedText/hashtags/mediaUrls
// untouched.

import { withErrorHandler, ok, err } from '@/lib/api'
import { requireWorkspace }          from '@/lib/auth/session'
import { db }                        from '@/lib/db/client'
import { publishNow }                from '@/lib/queue'

export const POST = withErrorHandler(async (_req, ctx) => {
  const { workspace } = await requireWorkspace()
  const { id: postId } = (ctx as { params: { id: string } }).params

  const post = await db.post.findFirst({
    where: { id: postId, workspaceId: workspace.id },
    include: { platforms: true },
  })
  if (!post) return err('Post not found', 404)

  type RetryablePlatform = { id: string; status: string; platform: string; socialAccountId: string }
  const toRetry = (post.platforms as RetryablePlatform[]).filter(p => p.status === 'FAILED')
  if (toRetry.length === 0) {
    return err('No failed platforms on this post to retry', 400)
  }

  for (const pp of toRetry) {
    await db.postPlatform.update({
      where: { id: pp.id },
      data: { status: 'PUBLISHING', errorMessage: null },
    })
    await publishNow({
      postId:          post.id,
      platform:        pp.platform,
      workspaceId:     workspace.id,
      socialAccountId: pp.socialAccountId,
    })
  }

  // Reflect the retry at the post level too, so the Content Library card
  // moves off "Failed" immediately rather than waiting for the worker.
  await db.post.update({ where: { id: post.id }, data: { status: 'PUBLISHING' } })

  return ok({ retried: toRetry.map(p => p.platform) })
})
