// src/lib/auth/adminEmails.ts
//
// Pure ADMIN_EMAILS parsing with no other auth imports. Kept separate from
// admin.ts so the NextAuth session callback in config.ts can compute
// isAdmin without a circular import (config.ts -> admin.ts -> session.ts
// -> config.ts).

export function adminEmailList(): string[] {
  const raw = process.env.ADMIN_EMAILS
  if (!raw) return []
  return raw.split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
}
