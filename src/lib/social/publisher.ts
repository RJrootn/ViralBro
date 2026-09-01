// src/lib/social/publisher.ts
// Posts content to each social platform after token validation
// Called by the BullMQ publish worker

import { getValidToken }                    from '@/lib/tokens/refresh'
import { db }                               from '@/lib/db/client'
import { isVideoUrl }                       from '@/lib/storage/s3'
import type { SocialPlatform, PostMediaType } from '@prisma/client'
import { shouldApplyBranding, applyBranding } from '@/lib/billing/branding'

export interface PublishResult {
  success:        boolean
  platformPostId?: string
  error?:         string
  url?:           string
}

// ── Master publish dispatcher ─────────────────────────────────────────────
export async function publishToplatform(
  socialAccountId: string,
  platform:        SocialPlatform,
  text:            string,
  hashtags:        string[],
  mediaUrls:       string[] = [],
  mediaType:       PostMediaType = 'IMAGE',
): Promise<PublishResult> {
  const token = await getValidToken(socialAccountId)

  const account = await db.socialAccount.findUnique({
    where: { id: socialAccountId },
    select: {
      platformUserId: true,
      platformUsername: true,
      workspace: { select: { user: { select: { plan: true } } } },
    },
  })
  if (!account) return { success: false, error: 'Social account not found' }

  let fullText = hashtags.length
    ? `${text}\n\n${hashtags.join(' ')}`
    : text

  // Free/Creator posts carry a "Made with VyralBro" tag — see
  // src/lib/billing/branding.ts for why this lives here (server-side,
  // publish-time) rather than in Studio's preview.
  if (shouldApplyBranding(account.workspace.user.plan)) {
    fullText = applyBranding(fullText, platform)
  }

  switch (platform) {
    case 'INSTAGRAM': return publishInstagram(token, account.platformUserId, fullText, mediaUrls, mediaType)
    case 'TWITTER':   return publishTwitter(token, fullText, mediaUrls)
    case 'LINKEDIN':  return publishLinkedIn(token, account.platformUserId, fullText, mediaUrls, mediaType)
    default:
      return { success: false, error: `Publisher not implemented for ${platform}` }
  }
}

// ── Instagram Graph API ───────────────────────────────────────────────────
//
// Reference: Meta Content Publishing API, Graph API v19.0.
//   - IMAGE:    POST /{ig-id}/media { image_url, caption } → media_publish
//   - VIDEO:    POST /{ig-id}/media { video_url, caption, media_type: 'REELS' }
//               Meta unified feed-video uploads under the Reels container as
//               of the v19+ API — there is no separate non-Reels feed-video
//               container anymore, so VIDEO and REEL take the same path here.
//   - REEL:     same as VIDEO (media_type: 'REELS').
//   - STORY:    POST /{ig-id}/media { image_url | video_url, media_type: 'STORIES' }
//               Stories do NOT support `caption` on the Graph API — Meta
//               silently ignores it, so we don't send one and we tell the
//               caller their caption won't show up.
//   - CAROUSEL: create one child container per item with `is_carousel_item:
//               true`, then a parent container with `media_type: 'CAROUSEL'`
//               and `children: [ids]`, then publish the parent.
//
// Video/Reel containers process asynchronously on Meta's side — publishing
// before processing finishes returns an error, so we poll `status_code` on
// the container until it's FINISHED (or ERROR) before calling media_publish.
async function publishInstagram(
  token:     string,
  igUserId:  string,
  text:      string,
  mediaUrls: string[],
  mediaType: PostMediaType,
): Promise<PublishResult> {
  try {
    if (mediaUrls.length === 0) {
      return {
        success: false,
        error:   'Instagram requires at least one image or video. Please add media.',
      }
    }

    switch (mediaType) {
      case 'VIDEO':
      case 'REEL':
        return await publishInstagramVideo(token, igUserId, text, mediaUrls[0])
      case 'STORY':
        return await publishInstagramStory(token, igUserId, mediaUrls[0])
      case 'CAROUSEL':
        return await publishInstagramCarousel(token, igUserId, text, mediaUrls)
      case 'IMAGE':
      default:
        return await publishInstagramImage(token, igUserId, text, mediaUrls[0])
    }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

async function igGraphFetch(path: string, body: Record<string, unknown>) {
  const res = await fetch(`https://graph.facebook.com/v19.0/${path}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error.message)
  return data
}

// Poll a media container's processing status until it's ready to publish.
// Reels/video containers go UNSPECIFIED/IN_PROGRESS → FINISHED (or ERROR) and
// can genuinely take tens of seconds. Images are *usually* synchronous, but
// calling media_publish before Meta's side has actually finished ingesting
// the image can fail with a bare "Media ID is not available" error — a
// short poll here (see publishInstagramImage) catches that instead of
// failing immediately on what's often just a timing race.
async function waitForContainerReady(
  containerId: string,
  token:       string,
  { timeoutMs = 90_000, intervalMs = 3_000, mediaLabel = 'video' }: { timeoutMs?: number; intervalMs?: number; mediaLabel?: string } = {},
): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${containerId}?` +
      new URLSearchParams({ fields: 'status_code', access_token: token })
    )
    const data = await res.json()
    if (data.error) throw new Error(data.error.message)

    if (data.status_code === 'FINISHED') return
    if (data.status_code === 'ERROR') {
      throw new Error(`Instagram failed to process the ${mediaLabel} — check the file is a supported format.`)
    }
    // IN_PROGRESS / EXPIRED / PUBLISHED / other → wait and re-check
    await new Promise(r => setTimeout(r, intervalMs))
  }
  throw new Error(`Timed out waiting for Instagram to finish processing the ${mediaLabel} (${Math.round(timeoutMs / 1000)}s).`)
}

async function publishInstagramImage(
  token: string, igUserId: string, caption: string, imageUrl: string,
): Promise<PublishResult> {
  const container = await igGraphFetch(`${igUserId}/media`, {
    image_url:    imageUrl,
    caption,
    access_token: token,
  })
  // Short poll, not the full 90s video timeout — images are usually ready
  // within a couple seconds, but publishing the instant the container is
  // created can race Meta's own ingestion and fail with a bare "Media ID is
  // not available" error. This catches that without meaningfully slowing
  // down the common case.
  await waitForContainerReady(container.id, token, { timeoutMs: 20_000, intervalMs: 2_000, mediaLabel: 'image' })
  const published = await igGraphFetch(`${igUserId}/media_publish`, {
    creation_id:  container.id,
    access_token: token,
  })
  return {
    success:        true,
    platformPostId: published.id,
    url: `https://www.instagram.com/p/${published.id}/`,
  }
}

async function publishInstagramVideo(
  token: string, igUserId: string, caption: string, videoUrl: string,
): Promise<PublishResult> {
  if (!isVideoUrl(videoUrl)) {
    // Not fatal — Meta will reject it too if it genuinely isn't a video —
    // but surfacing this up front avoids a 90s poll for an obvious mistake.
    console.warn('[Instagram] mediaType=VIDEO/REEL but URL does not look like a video file:', videoUrl)
  }

  const container = await igGraphFetch(`${igUserId}/media`, {
    video_url:    videoUrl,
    caption,
    media_type:   'REELS',
    access_token: token,
  })

  await waitForContainerReady(container.id, token)

  const published = await igGraphFetch(`${igUserId}/media_publish`, {
    creation_id:  container.id,
    access_token: token,
  })
  return {
    success:        true,
    platformPostId: published.id,
    url: `https://www.instagram.com/reel/${published.id}/`,
  }
}

async function publishInstagramStory(
  token: string, igUserId: string, mediaUrl: string,
): Promise<PublishResult> {
  const video = isVideoUrl(mediaUrl)

  const container = await igGraphFetch(`${igUserId}/media`, {
    ...(video ? { video_url: mediaUrl } : { image_url: mediaUrl }),
    media_type:   'STORIES',
    access_token: token,
    // No `caption` — the Graph API does not support captions on Stories.
  })

  if (video) await waitForContainerReady(container.id, token)

  const published = await igGraphFetch(`${igUserId}/media_publish`, {
    creation_id:  container.id,
    access_token: token,
  })
  return {
    success:        true,
    platformPostId: published.id,
    url: `https://www.instagram.com/stories/highlights/${published.id}/`,
  }
}

async function publishInstagramCarousel(
  token: string, igUserId: string, caption: string, mediaUrls: string[],
): Promise<PublishResult> {
  const items = mediaUrls.slice(0, 10) // Graph API caps carousels at 10 items
  if (items.length < 2) {
    // Falls back to a single image/video post rather than erroring outright —
    // a carousel needs 2+ items, but one media item is still publishable.
    return isVideoUrl(items[0])
      ? publishInstagramVideo(token, igUserId, caption, items[0])
      : publishInstagramImage(token, igUserId, caption, items[0])
  }

  const children = await Promise.all(
    items.map(async (url) => {
      const video = isVideoUrl(url)
      const child = await igGraphFetch(`${igUserId}/media`, {
        ...(video ? { video_url: url } : { image_url: url }),
        is_carousel_item: true,
        access_token:     token,
      })
      if (video) await waitForContainerReady(child.id, token)
      return child.id
    })
  )

  const container = await igGraphFetch(`${igUserId}/media`, {
    media_type:   'CAROUSEL',
    children,
    caption,
    access_token: token,
  })
  const published = await igGraphFetch(`${igUserId}/media_publish`, {
    creation_id:  container.id,
    access_token: token,
  })
  return {
    success:        true,
    platformPostId: published.id,
    url: `https://www.instagram.com/p/${published.id}/`,
  }
}

// ── Twitter/X media upload (v2 chunked) ───────────────────────────────────
// Media used to require the old v1.1 upload.twitter.com endpoint (OAuth
// 1.0a only), which is why this was previously skipped entirely — every
// post with an image or video silently went out as text-only. X has since
// added a v2 endpoint that accepts the same OAuth 2.0 user-context bearer
// token already used to post tweets, so no separate auth flow is needed —
// just the `media.write` scope (see src/app/api/platforms/twitter/route.ts;
// accounts connected before that scope was added need to reconnect once).
const TWITTER_UPLOAD_URL = 'https://api.x.com/2/media/upload'
const TWITTER_CHUNK_SIZE = 4 * 1024 * 1024 // 4MB — under X's 5MB-per-chunk cap
const TWITTER_PROCESSING_TIMEOUT_MS = 120_000

async function uploadTwitterMedia(token: string, mediaUrl: string): Promise<string> {
  const authHeader = { Authorization: `Bearer ${token}` }

  const mediaRes = await fetch(mediaUrl)
  if (!mediaRes.ok) throw new Error(`Could not fetch media for Twitter upload (${mediaRes.status})`)
  const contentType = mediaRes.headers.get('content-type') ?? (isVideoUrl(mediaUrl) ? 'video/mp4' : 'image/jpeg')
  const buf = Buffer.from(await mediaRes.arrayBuffer())
  const mediaCategory =
    contentType.startsWith('video/') ? 'tweet_video' :
    contentType === 'image/gif'      ? 'tweet_gif'   :
                                        'tweet_image'

  async function call(params: Record<string, string>, body?: FormData) {
    const url = params.command === 'STATUS'
      ? `${TWITTER_UPLOAD_URL}?${new URLSearchParams(params)}`
      : TWITTER_UPLOAD_URL
    const res = await fetch(url, {
      method:  params.command === 'STATUS' ? 'GET' : 'POST',
      headers: authHeader,
      body:    params.command === 'STATUS' ? undefined : body,
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.detail ?? data.errors?.[0]?.message ?? `Twitter media ${params.command} failed`)
    return data
  }

  const initForm = new FormData()
  initForm.set('command', 'INIT')
  initForm.set('media_type', contentType)
  initForm.set('total_bytes', String(buf.length))
  initForm.set('media_category', mediaCategory)
  const initData = await call({ command: 'INIT' }, initForm)
  const mediaId = initData.data?.id
  if (!mediaId) throw new Error('Twitter media INIT did not return a media id')

  for (let offset = 0, segmentIndex = 0; offset < buf.length; offset += TWITTER_CHUNK_SIZE, segmentIndex++) {
    const appendForm = new FormData()
    appendForm.set('command', 'APPEND')
    appendForm.set('media_id', mediaId)
    appendForm.set('segment_index', String(segmentIndex))
    appendForm.set('media', new Blob([buf.subarray(offset, offset + TWITTER_CHUNK_SIZE)]))
    await call({ command: 'APPEND' }, appendForm)
  }

  const finalizeForm = new FormData()
  finalizeForm.set('command', 'FINALIZE')
  finalizeForm.set('media_id', mediaId)
  const finalizeData = await call({ command: 'FINALIZE' }, finalizeForm)

  // Images finalize synchronously (no processing_info). Video/GIF need
  // polling — X's own recommended pattern is to wait check_after_secs
  // between polls rather than hammering the endpoint.
  let processingInfo = finalizeData.data?.processing_info
  const deadline = Date.now() + TWITTER_PROCESSING_TIMEOUT_MS
  while (processingInfo && processingInfo.state !== 'succeeded') {
    if (processingInfo.state === 'failed') {
      throw new Error(processingInfo.error?.message ?? 'Twitter failed to process the media')
    }
    if (Date.now() > deadline) throw new Error('Timed out waiting for Twitter to process the media')
    await new Promise(r => setTimeout(r, (processingInfo.check_after_secs ?? 3) * 1000))
    const statusData = await call({ command: 'STATUS', media_id: mediaId })
    processingInfo = statusData.data?.processing_info
  }

  return mediaId
}

// ── Twitter v2 API ────────────────────────────────────────────────────────
async function publishTwitter(
  token:     string,
  text:      string,
  mediaUrls: string[],
): Promise<PublishResult> {
  try {
    // Twitter has a 280-char limit — truncate gracefully
    const tweetText = text.length > 280 ? text.slice(0, 277) + '…' : text

    const body: Record<string, unknown> = { text: tweetText }

    if (mediaUrls.length) {
      // X allows up to 4 images OR exactly 1 video/GIF per tweet.
      const isVideo = isVideoUrl(mediaUrls[0])
      const toUpload = isVideo ? mediaUrls.slice(0, 1) : mediaUrls.slice(0, 4)
      const mediaIds = await Promise.all(toUpload.map(url => uploadTwitterMedia(token, url)))
      body.media = { media_ids: mediaIds }
    }

    const res = await fetch('https://api.twitter.com/2/tweets', {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify(body),
    })

    const data = await res.json()
    if (data.errors?.length) throw new Error(data.errors[0].message)
    if (!res.ok) throw new Error(data.detail ?? 'Twitter API error')

    return {
      success:        true,
      platformPostId: data.data.id,
      url: `https://twitter.com/i/web/status/${data.data.id}`,
    }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

// ── LinkedIn UGC Post API ─────────────────────────────────────────────────
async function publishLinkedIn(
  token:     string,
  memberId:  string,
  text:      string,
  mediaUrls: string[],
  mediaType: PostMediaType = 'IMAGE',
): Promise<PublishResult> {
  try {
    // LinkedIn images can be shared by URL (`originalUrl`, shareMediaCategory
    // 'IMAGE'), but real video requires LinkedIn's separate Assets API
    // (register an upload, PUT the actual video bytes, then reference the
    // resulting asset URN) — there's no "just pass a video URL" option like
    // Instagram/Twitter have. That upload flow isn't implemented yet, so
    // fail clearly here instead of silently sending shareMediaCategory
    // 'IMAGE' with a video URL, which LinkedIn would reject or mishandle
    // with a confusing raw API error.
    if ((mediaType === 'VIDEO' || mediaType === 'REEL') && mediaUrls.length) {
      return {
        success: false,
        error:   'LinkedIn video posting is not supported yet — LinkedIn requires a separate video upload flow. Please post to LinkedIn without video for now.',
      }
    }

    const authorUrn = `urn:li:person:${memberId}`

    const body: Record<string, unknown> = {
      author:         authorUrn,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary:  { text },
          shareMediaCategory: mediaUrls.length ? 'IMAGE' : 'NONE',
          ...(mediaUrls.length ? {
            media: mediaUrls.slice(0, 1).map(url => ({
              status:    'READY',
              originalUrl: url,
            })),
          } : {}),
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
      },
    }

    const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type':  'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.message ?? `LinkedIn API error ${res.status}`)
    }

    const postId = res.headers.get('x-restli-id') ?? ''
    return {
      success:        true,
      platformPostId: postId,
      url: `https://www.linkedin.com/feed/update/${postId}/`,
    }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}
