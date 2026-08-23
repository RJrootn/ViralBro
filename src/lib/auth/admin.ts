// src/lib/auth/admin.ts
//
// There's no role/permissions system in the database — every signed-up
// user is just a `User` row with a `plan`, nothing marks anyone as staff.
// Rather than build out a full RBAC system for a dashboard only RJ needs
// right now, admin access is a plain allowlist of emails from an env var.
// ADMIN_EMAILS defaults to rj@rootn.ai so this works even before the env
// var is set in Netlify, but the real list should still be set explicitly
// there — see .env.example.

import { requireSession } from './session'

function adminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS ?? 'rj@rootn.ai'
  return raw.split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
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
