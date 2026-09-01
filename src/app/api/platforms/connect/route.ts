export const dynamic = "force-dynamic"
// src/app/api/platforms/connect/route.ts
// POST /api/platforms/connect — save OAuth tokens after platform OAuth flow

import { z }                     from 'zod'
import { withErrorHandler, ok }  from '@/lib/api'
import { requireWorkspace }      from '@/lib/auth/session'
import { db }                    from '@/lib/db/client'
import { encryptToken }          from '@/lib/tokens/encrypt'
import type { SocialPlatform }   from '@prisma/client'

const schema = z.object({
  platform:        z.enum(['INSTAGRAM','TWITTER','LINKEDIN','YOUTUBE','FACEBOOK','WHATSAPP']),
  platformUserId:   z.string(),
  platformUsername: z.string(),
  displayName:      z.string().optional(),
  avatarUrl:        z.string().url().optional(),
  accessToken:      z.string(),
  refreshToken:     z.string().optional(),
  tokenExpiresAt:   z.string().datetime().optional(),
  scopes:           z.array(z.string()).default([]),
})

export const POST = withErrorHandler(async (req) => {
  const { workspace } = await requireWorkspace()
  const body = schema.parse(await req.json())

  const account = await db.socialAccount.upsert({
    where: {
      workspaceId_platform: {
        workspaceId: workspace.id,
        platform:    body.platform as SocialPlatform,
      },
    },
    create: {
      workspaceId:     workspace.id,
      platform:        body.platform as SocialPlatform,
      platformUserId:   body.platformUserId,
      platformUsername: body.platformUsername,
      displayName:      body.displayName,
      avatarUrl:        body.avatarUrl,
      accessToken:      encryptToken(body.accessToken),
      refreshToken:     body.refreshToken ? encryptToken(body.refreshToken) : null,
      tokenExpiresAt:   body.tokenExpiresAt ? new Date(body.tokenExpiresAt) : null,
      scopes:           body.scopes,
    },
    update: {
      platformUserId:   body.platformUserId,
      platformUsername: body.platformUsername,
      displayName:      body.displayName,
      avatarUrl:        body.avatarUrl,
      accessToken:      encryptToken(body.accessToken),
      refreshToken:     body.refreshToken ? encryptToken(body.refreshToken) : null,
      tokenExpiresAt:   body.tokenExpiresAt ? new Date(body.tokenExpiresAt) : null,
      scopes:           body.scopes,
      isActive:         true,
    },
  })

  return ok({ account })
})

// GET /api/platforms/connect — list connected accounts
export const GET = withErrorHandler(async () => {
  const { workspace } = await requireWorkspace()

  const accounts = await db.socialAccount.findMany({
    where:   { workspaceId: workspace.id, isActive: true },
    select: {
      id:               true,
      platform:         true,
      platformUsername: true,
      displayName:      true,
      avatarUrl:        true,
      connectedAt:      true,
      tokenExpiresAt:   true,
    },
    orderBy: { connectedAt: 'asc' },
  })

  return ok({ accounts })
})

