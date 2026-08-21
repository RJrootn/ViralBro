// src/app/api/media/presign/route.ts
// POST /api/media/presign — mint a short-lived S3 PUT URL for Studio uploads.
//
// The browser uploads the actual file bytes straight to S3 with the returned
// `uploadUrl` (PUT, same Content-Type it declared here) — this route never
// touches the file itself, it only signs a request. Once the PUT succeeds,
// the caller stores `publicUrl` on the post/platform payload it sends to
// POST /api/posts.

import { z }                                          from 'zod'
import { withErrorHandler, ok, err }                  from '@/lib/api'
import { requireWorkspace }                           from '@/lib/auth/session'
import { presignUpload, isAllowedContentType }        from '@/lib/storage/s3'

const bodySchema = z.object({
  filename:    z.string().min(1).max(255),
  contentType: z.string().min(1).max(100),
})

export const POST = withErrorHandler(async (req) => {
  const { workspace } = await requireWorkspace()
  const body = bodySchema.parse(await req.json())

  if (!isAllowedContentType(body.contentType)) {
    return err(
      `Unsupported file type "${body.contentType}". Allowed: JPEG, PNG, WebP, GIF images, or MP4/MOV/WebM video.`,
      415,
    )
  }

  const result = await presignUpload(workspace.id, body.filename, body.contentType)
  return ok(result)
})
