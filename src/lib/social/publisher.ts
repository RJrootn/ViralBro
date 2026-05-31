// src/lib/social/publisher.ts
// Posts content to each social platform after token validation
// Called by the BullMQ publish worker

import { getValidToken }       from '@/lib/tokens/refresh'
import { db }                  from '@/lib/db/client'
import type { SocialPlatform } from '@prisma/client'

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
): Promise<PublishResult> {
  const token = await getValidToken(socialAccountId)

  const account = await db.socialAccount.findUnique({
    where: { id: socialAccountId },
    select: { platformUserId: true, platformUsername: true },
  })
  if (!account) return { success: false, error: 'Social account not found' }

  const fullText = hashtags.length
    ? `${text}\n\n${hashtags.join(' ')}`
    : text

  switch (platform) {
    case 'INSTAGRAM': return publishInstagram(token, account.platformUserId, fullText, mediaUrls)
    case 'TWITTER':   return publishTwitter(token, fullText, mediaUrls)
    case 'LINKEDIN':  return publishLinkedIn(token, account.platformUserId, fullText, mediaUrls)
    default:
      return { success: false, error: `Publisher not implemented for ${platform}` }
  }
}

// ── Instagram Graph API ───────────────────────────────────────────────────
async function publishInstagram(
  token:    string,
  igUserId: string,
  text:     string,
  mediaUrls: string[],
): Promise<PublishResult> {
  try {
    const imageUrl = mediaUrls[0]

    if (imageUrl) {
      // Step 1: Create media container
      const containerRes = await fetch(
        `https://graph.facebook.com/v19.0/${igUserId}/media`,
        {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image_url:   imageUrl,
            caption:     text,
            access_token: token,
          }),
        }
      )
      const container = await containerRes.json()
      if (container.error) throw new Error(container.error.message)

      // Step 2: Publish the container
      const publishRes = await fetch(
        `https://graph.facebook.com/v19.0/${igUserId}/media_publish`,
        {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            creation_id:  container.id,
            access_token: token,
          }),
        }
      )
      const published = await publishRes.json()
      if (published.error) throw new Error(published.error.message)

      return {
        success:        true,
        platformPostId: published.id,
        url: `https://www.instagram.com/p/${published.id}/`,
      }
    } else {
      // Text-only isn't supported on Instagram — post a caption-only reel placeholder
      return {
        success: false,
        error:   'Instagram requires at least one image or video. Please add media.',
      }
    }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
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

    // Media upload (if any) — Twitter requires separate media upload step
    if (mediaUrls.length) {
      // Note: Full media upload implementation requires multipart upload to
      // https://upload.twitter.com/1.1/media/upload.json (v1.1 endpoint)
      // For now we note it's needed
      console.warn('[Twitter] Media upload requires v1.1 endpoint — skipping for now')
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
): Promise<PublishResult> {
  try {
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
