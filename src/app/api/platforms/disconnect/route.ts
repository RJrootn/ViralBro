// src/app/api/platforms/disconnect/route.ts
// DELETE /api/platforms/disconnect?platform=INSTAGRAM
// Soft-disconnects a social account (marks inactive, removes tokens)

import { NextResponse }       from 'next/server'
import { withErrorHandler, ok, err } from '@/lib/api'
import { requireWorkspace }   from '@/lib/auth/session'
import { db }                 from '@/lib/db/client'
import type { SocialPlatform } from '@prisma/client'

const VALID_PLATFORMS: SocialPlatform[] = [
  'INSTAGRAM', 'TWITTER', 'LINKEDIN', 'YOUTUBE', 'FACEBOOK', 'WHATSAPP',
]

export const DELETE = withErrorHandler(async (req) => {
  const { workspace } = await requireWorkspace()
  const { searchParams } = new URL(req.url)
  const platform = searchParams.get('platform')?.toUpperCase() as SocialPlatform

  if (!platform || !VALID_PLATFORMS.includes(platform)) {
    return err('Invalid platform', 400)
  }

  const account = await db.socialAccount.findUnique({
    where: { workspaceId_platform: { workspaceId: workspace.id, platform } },
  })

  if (!account) return err('Account not connected', 404)

  // Revoke token with the platform (best-effort)
  try {
    await revokePlatformToken(platform, account.accessToken)
  } catch (e) {
    console.warn(`[Disconnect] Token revocation failed for ${platform}:`, e)
  }

  // Hard delete from DB (user can reconnect anytime)
  await db.socialAccount.delete({
    where: { workspaceId_platform: { workspaceId: workspace.id, platform } },
  })

  return ok({ disconnected: true, platform })
})

async function revokePlatformToken(platform: SocialPlatform, encryptedToken: string) {
  const { decryptToken } = await import('@/lib/tokens/encrypt')
  const token = decryptToken(encryptedToken)

  switch (platform) {
    case 'TWITTER':
      await fetch('https://api.twitter.com/2/oauth2/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          token,
          token_type_hint: 'access_token',
          client_id:       process.env.TWITTER_CLIENT_ID!,
        }),
      })
      break

    case 'LINKEDIN':
      // LinkedIn doesn't have a revoke endpoint — token expires naturally
      break

    case 'INSTAGRAM':
    case 'FACEBOOK':
      // Meta: delete permissions
      await fetch(
        `https://graph.facebook.com/v19.0/me/permissions?access_token=${token}`,
        { method: 'DELETE' }
      )
      break
  }
}
