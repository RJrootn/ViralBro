// src/app/api/media/complete/route.ts
//
// POST /api/media/complete — called by Studio right after a successful S3
// upload (see src/app/studio/page.tsx's uploadFile). Images pass through
// untouched. Videos get normalized first (see
// src/lib/media/normalizeVideo.ts for why) — this is what actually fixes
// Instagram rejecting videos with its generic "failed to process the
// video" error, instead of only papering over it in the UI.

import { z }                          from 'zod'
import { withErrorHandler, ok, err }  from '@/lib/api'
import { requireWorkspace }           from '@/lib/auth/session'
import { isVideoContentType }         from '@/lib/storage/s3'
import { normalizeVideo }             from '@/lib/media/normalizeVideo'

const bodySchema = z.object({
  key:         z.string().min(1),
  contentType: z.string().min(1),
  publicUrl:   z.string().url(),
})

export const POST = withErrorHandler(async (req) => {
  await requireWorkspace()
  const body = bodySchema.parse(await req.json())

  if (!isVideoContentType(body.contentType)) {
    return ok({ publicUrl: body.publicUrl })
  }

  try {
    const { publicUrl } = await normalizeVideo(body.key)
    return ok({ publicUrl })
  } catch (e: any) {
    console.error('[media/complete] video normalization failed:', e)
    return err(
      "Could not process this video — it may be corrupted or in a format we can't convert. Try re-exporting as MP4 and uploading again.",
      422,
    )
  }
})
