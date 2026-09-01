// src/lib/auth/session.ts
// Typed server-side session helper

import { getServerSession as nextAuthGetServerSession } from 'next-auth'
import { authOptions } from './config'
import { db } from '@/lib/db/client'

export async function getServerSession() {
  return nextAuthGetServerSession(authOptions)
}

/** Returns session or throws 401 — use in API routes */
export async function requireSession() {
  const session = await getServerSession()
  if (!session?.user?.id) {
    throw new Error('UNAUTHORIZED')
  }
  return session
}

/**
 * Returns the workspace for the current user, creating one if missing.
 *
 * Every real signup gets its workspace from NextAuth's createUser event in
 * config.ts, alongside a one-time AI credit bonus — this is only a fallback
 * for the rare case that event failed (it swallows errors so a DB hiccup
 * doesn't break login itself). Self-healing here just recreates the
 * workspace so the user isn't permanently locked out of every route that
 * calls this; it deliberately does NOT re-grant the signup bonus, since this
 * path can't tell "creation failed" apart from "creation raced and lost."
 */
export async function requireWorkspace() {
  const session = await requireSession()
  const workspace = await db.workspace.upsert({
    where:  { userId: session.user.id },
    update: {},
    create: { userId: session.user.id, name: session.user.name ?? 'My Workspace' },
  })
  return { session, workspace }
}
