// src/app/api/ai/generate/route.ts
// POST /api/ai/generate — AI content generation endpoint

import { z }                     from 'zod'
import { Prisma }                from '@prisma/client'
import { startOfMonth }          from 'date-fns'
import { withErrorHandler, ok, err, PLAN_LIMITS } from '@/lib/api'
import { requireWorkspace }      from '@/lib/auth/session'
import { generateContent }       from '@/lib/ai/generate'
import { ensureFreshCredits }    from '@/lib/billing/credits'
import { db }                    from '@/lib/db/client'
import type { SocialPlatform, Plan } from '@prisma/client'

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

  // Hard guardrail, not just a publish-time one: once an account is already
  // at its monthly post cap, don't let it keep generating either. Before
  // this, generation was only gated by credits/platform-count, so a
  // capped-out user could keep pulling polished, ready-to-copy content out
  // of the AI for free even though publishing it through us was already
  // blocked — the real product only holds together if the value we charge
  // for is actually gated, not just the "publish" button.
  if (limits.postsPerMonth !== -1) {
    const postsThisMonth = await db.post.count({
      where: { workspaceId: workspace.id, createdAt: { gte: startOfMonth(new Date()) } },
    })
    if (postsThisMonth >= limits.postsPerMonth) {
      return err(
        `You've hit your plan's ${limits.postsPerMonth} posts/month limit. Upgrade to keep generating this month.`,
        402,
      )
    }
  }

  // Lazily true-up the credit balance to this cycle's cap before spending
  // from it — see src/lib/billing/credits.ts.
  await ensureFreshCredits(session.user.id, session.user.plan as Plan)

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
