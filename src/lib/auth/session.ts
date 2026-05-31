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

/** Returns the workspace for the current user (creates one if missing) */
export async function requireWorkspace() {
  const session = await requireSession()
  const workspace = await db.workspace.findUnique({
    where: { userId: session.user.id },
  })
  if (!workspace) throw new Error('WORKSPACE_NOT_FOUND')
  return { session, workspace }
}
