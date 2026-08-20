// src/app/api/ai/generate/route.ts
// POST /api/ai/generate — AI content generation endpoint

import { z }                     from 'zod'
import { Prisma }                from '@prisma/client'
import { withErrorHandler, ok, err, PLAN_LIMITS } from '@/lib/api'
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

// Atomically reserve `used` credits: a single guarded UPDATE (decrement only
// if the balance covers it) so two concurrent requests can't both read the
// same balance and both succeed, going negative. Returns the new balance, or
// null if there wasn't enough.
async function reserveCredits(userId: string, used: number): Promise<number | null> {
  const rows = await db.$queryRaw<{ aiCreditBalance: number }[]>(Prisma.sql`
    UPDATE "User"
    SET "aiCreditBalance" = "aiCreditBalance" - ${used}
    WHERE id = ${userId} AND "aiCreditBalance" >= ${used}
    RETURNING "aiCreditBalance"
  `)
  return rows[0]?.aiCreditBalance ?? null
}

async function refundCredits(userId: string, used: number) {
  await db.user.update({ where: { id: userId }, data: { aiCreditBalance: { increment: used } } })
}

export const POST = withErrorHandler(async (req) => {
  const { session, workspace } = await requireWorkspace()

  const body   = await req.json()
  const input  = schema.parse(body)

  // Plan-gated platform count — this was only enforced (loosely) in the UI's
  // static Free/Creator/Pro/Agency copy, never on the server.
  const limits = PLAN_LIMITS[session.user.plan as keyof typeof PLAN_LIMITS] ?? PLAN_LIMITS.FREE
  if (input.platforms.length > limits.platforms) {
    return err(
      `Your plan allows generating for up to ${limits.platforms} platform(s) at a time. Upgrade for more.`,
      402,
    )
  }

  const used = input.platforms.length

  // Reserve credits *before* calling the AI so two concurrent requests can't
  // both pass a "balance > 0" check against the same stale read (the
  // previous version read the balance, called the AI, then wrote a debit
  // computed from that same stale read — a classic double-spend race).
  const newBalance = await reserveCredits(session.user.id, used)
  if (newBalance === null) {
    return err('Insufficient AI credits. Please upgrade your plan.', 402)
  }

  let result
  try {
    result = await generateContent({
      ...input,
      platforms:   input.platforms as SocialPlatform[],
      workspaceId: workspace.id,
    })
  } catch (e) {
    // Generation failed — refund the reservation, don't charge for nothing.
    await refundCredits(session.user.id, used)
    throw e
  }

  await db.aiCredit.create({
    data: {
      userId:   session.user.id,
      amount:   -used,
      reason:   'used',
      balance:  newBalance,
    },
  })

  return ok({ generated: result, creditsUsed: used, creditsRemaining: newBalance })
})
