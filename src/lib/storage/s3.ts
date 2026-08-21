// src/lib/storage/s3.ts
//
// AWS S3 storage for media uploaded in Studio (images, Reels/Story videos).
// The browser uploads directly to S3 via a short-lived presigned PUT URL —
// files never pass through our own Netlify function, which matters here
// because serverless function request bodies are size-capped well below a
// typical Reels-length video.
//
// Required env vars (Netlify + Railway):
//   AWS_ACCESS_KEY_ID
//   AWS_SECRET_ACCESS_KEY
//   AWS_REGION            e.g. "ap-south-1"
//   AWS_S3_BUCKET         bucket name, must allow public-read on the objects
//                          this uploads (see bucket policy note below) since
//                          Meta/X/LinkedIn's APIs fetch media by public URL.
//
// Bucket policy: the bucket needs a policy granting `s3:GetObject` on
// `arn:aws:s3:::<bucket>/uploads/*` to `"Principal": "*"` (public read for
// just that prefix — do NOT make the whole bucket public), plus CORS config
// allowing PUT from the app's origin(s) so the browser can upload directly:
//   AllowedMethods: ["PUT"], AllowedOrigins: ["https://vyralbro.netlify.app"],
//   AllowedHeaders: ["*"]

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl }               from '@aws-sdk/s3-request-presigner'

const REGION = process.env.AWS_REGION!
const BUCKET = process.env.AWS_S3_BUCKET!

const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId:     process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

// Coarse allow-list — enough to keep obviously-wrong uploads (e.g. a .exe
// someone drags in) out, without trying to fully replicate every platform's
// exact codec/format requirements here.
const ALLOWED_CONTENT_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'video/mp4', 'video/quicktime', 'video/webm',
])

export function isAllowedContentType(contentType: string) {
  return ALLOWED_CONTENT_TYPES.has(contentType)
}

export function isVideoContentType(contentType: string) {
  return contentType.startsWith('video/')
}

// Heuristic used by the publisher when it only has a URL (not the original
// content-type) to decide whether to send Meta an `image_url` or `video_url`.
export function isVideoUrl(url: string) {
  return /\.(mp4|mov|webm|m4v)(\?|$)/i.test(url)
}

interface PresignResult {
  uploadUrl: string   // PUT here from the browser
  publicUrl: string   // store this on the Post/PostPlatform once upload succeeds
  key:       string
}

export async function presignUpload(
  workspaceId: string,
  filename:    string,
  contentType: string,
): Promise<PresignResult> {
  const ext = filename.split('.').pop()?.toLowerCase() ?? 'bin'
  const key = `uploads/${workspaceId}/${Date.now()}-${crypto.randomUUID()}.${ext}`

  const command = new PutObjectCommand({
    Bucket:      BUCKET,
    Key:         key,
    ContentType: contentType,
  })

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 }) // 5 min
  const publicUrl = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`

  return { uploadUrl, publicUrl, key }
}
