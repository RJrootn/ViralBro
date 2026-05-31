// src/app/api/platforms/refresh/route.ts
// POST /api/platforms/refresh
// Manually trigger a token refresh for a specific platform

import { z }                          from 'zod'
import { withErrorHandler, ok, err }  from '@/lib/api'
import { requireWorkspace }           from '@/lib/auth/session'
import { db }                         from '@/lib/db/client'
import { getValidToken }              from '@/lib/tokens/refresh'
import type { SocialPlatform }        from '@prisma/client'

const schema = z.object({
  platform: z.enum(['INSTAGRAM', 'TWITTER', 'LINKEDIN', 'YOUTUBE', 'FACEBOOK', 'WHATSAPP']),
})

export const POST = withErrorHandler(async (req) => {
  const { workspace } = await requireWorkspace()
  const { platform }  = schema.parse(await req.json())

  const account = await db.socialAccount.findUnique({
    where: {
      workspaceId_platform: {
        workspaceId: workspace.id,
        platform:    platform as SocialPlatform,
      },
    },
  })

  if (!account) return err('Platform not connected', 404)
  if (!account.isActive) return err('Platform account is inactive — please reconnect', 400)

  try {
    await getValidToken(account.id) // triggers refresh if needed
    const updated = await db.socialAccount.findUnique({
      where: { id: account.id },
      select: { tokenExpiresAt: true, isActive: true },
    })

    return ok({
      refreshed:     true,
      platform,
      tokenExpiresAt: updated?.tokenExpiresAt,
    })
  } catch (e: any) {
    return err(`Token refresh failed: ${e.message}`, 500)
  }
})
