// src/app/api/ai/generate/route.ts
// POST /api/ai/generate — AI content generation endpoint

import { NextResponse }          from 'next/server'
import { z }                     from 'zod'
import { withErrorHandler, ok, err } from '@/lib/api'
import { requireWorkspace }      from '@/lib/auth/session'
import { generateContent }       from '@/lib/ai/generate'
import { db }                    from '@/lib/db/client'
import type { SocialPlatform }   from '@prisma/client'

const schema = z.object({
  rawContent: z.string().min(10).max(5000),
  tone:       z.string().default('authentic'),
  format:     z.string().default('listicle'),
  language:   z.string().default('en'),
  platforms:  z.array(z.enum([
    'INSTAGRAM','TWITTER','LINKEDIN','YOUTUBE','FACEBOOK','WHATSAPP'
  ])).min(1).max(6),
})

export const POST = withErrorHandler(async (req) => {
  const { session, workspace } = await requireWorkspace()

  // Check AI credit balance
  const credits = await db.aiCredit.aggregate({
    where: { userId: session.user.id },
    _sum:  { amount: true },
  })
  const balance = credits._sum.amount ?? 0
  if (balance <= 0) {
    return err('Insufficient AI credits. Please upgrade your plan.', 402)
  }

  const body   = await req.json()
  const input  = schema.parse(body)

  const result = await generateContent({
    ...input,
    platforms:   input.platforms as SocialPlatform[],
    workspaceId: workspace.id,
  })

  // Deduct credits
  const used = input.platforms.length
  await db.aiCredit.create({
    data: {
      userId:   session.user.id,
      amount:   -used,
      reason:   'used',
      balance:  balance - used,
    },
  })

  return ok({ generated: result, creditsUsed: used, creditsRemaining: balance - used })
})
