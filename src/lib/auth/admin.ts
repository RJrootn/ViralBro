// src/lib/auth/admin.ts
//
// There's no role/permissions system in the database — every signed-up
// user is just a `User` row with a `plan`, nothing marks anyone as staff.
// Rather than build out a full RBAC system for a dashboard only RJ needs
// right now, admin access is a plain allowlist of emails from an env var.
// ADMIN_EMAILS must be set explicitly (e.g. in Netlify) — see .env.example.

import { requireSession } from './session'
import { adminEmailList } from './adminEmails'

function adminEmails(): string[] {
  const list = adminEmailList()
  if (list.length === 0) {
    throw new Error('ADMIN_EMAILS environment variable is not set')
  }
  return list
}

/** Returns the session if the signed-in user is an admin — throws 'FORBIDDEN' otherwise. */
export async function requireAdmin() {
  const session = await requireSession()
  const email = session.user.email?.toLowerCase() ?? ''
  if (!adminEmails().includes(email)) {
    throw new Error('FORBIDDEN')
  }
  return session
}

export async function isAdminEmail(email: string | null | undefined) {
  if (!email) return false
  return adminEmails().includes(email.toLowerCase())
}
