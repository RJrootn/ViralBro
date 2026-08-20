export const dynamic = "force-dynamic"
// src/app/api/waitlist/route.ts
// POST /api/waitlist — pre-launch email capture from the landing page
//
// Previously both landing-page "waitlist" forms were pure UI stubs (a
// setTimeout + a success message) — no email was ever actually stored
// anywhere. This is the real endpoint they now call.

import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { withErrorHandler, ok, err } from '@/lib/api'
import { db } from '@/lib/db/client'

const schema = z.object({
  email: z.string().email(),
  source: z.string().max(100).optional(),
})

export const POST = withErrorHandler(async (req) => {
  const { email, source } = schema.parse(await req.json())

  try {
    await db.waitlistSignup.create({
      data: { email: email.toLowerCase().trim(), source: source ?? 'landing' },
    })
  } catch (e) {
    // Unique constraint on email — they're already on the list, which is a
    // success from the user's point of view, not an error.
    const alreadyExists = e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002'
    if (!alreadyExists) throw e
  }

  // Best-effort notification email — never fail the signup because the
  // notification couldn't be sent.
  if (process.env.RESEND_API_KEY) {
    try {
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL ?? 'noreply@vyral.in',
        to: process.env.RESEND_FROM_EMAIL ?? 'noreply@vyral.in',
        subject: 'New VyralBro waitlist signup',
        text: `${email} joined the waitlist (source: ${source ?? 'landing'})`,
      })
    } catch (e) {
      console.error('[waitlist] notification email failed:', e)
    }
  }

  return ok({ joined: true }, 201)
})
