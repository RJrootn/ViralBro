// src/lib/billing/branding.ts
//
// The "Powered by VyralBro" tag appended to posts published by Free/Creator
// accounts — a deliberate freemium growth loop (the same pattern Zoom,
// Calendly, and Canva's free tier use): every branded post is free
// marketing, and removing it becomes a real, visible reason to upgrade to
// Pro/Agency rather than just "more quota you might not need yet."
//
// This lives server-side in the publish path (see publisher.ts), not in
// Studio's preview generation — so it can't be stripped by editing the
// client, and a plan upgrade takes effect on the very next publish without
// needing to regenerate anything.

import type { Plan } from '@prisma/client'

const BRANDED_PLANS: Plan[] = ['FREE', 'CREATOR']

const TAG_TEXT = '— Made with VyralBro 🇮🇳 vyralbro.in'

export function shouldApplyBranding(plan: Plan): boolean {
  return BRANDED_PLANS.includes(plan)
}

// Per-platform hard caps this needs to respect (see PM in studio/page.tsx —
// kept in sync manually since that's a client-side display constant and
// this is the server-side enforcement point; Twitter's is the only one
// tight enough to realistically collide with a full-length post).
const PLATFORM_MAX_LENGTH: Partial<Record<string, number>> = {
  TWITTER: 280,
  INSTAGRAM: 2200,
  WHATSAPP: 1000,
  LINKEDIN: 3000,
}

// Appends the tag if there's room; if the post is long enough that adding it
// would blow the platform's character cap, trims the post text (not the
// tag) so the tag still appears — the whole point is it always shows up on
// a branded-plan post, not "when convenient."
export function applyBranding(text: string, platform: string): string {
  const tag = `\n\n${TAG_TEXT}`
  const max = PLATFORM_MAX_LENGTH[platform]
  if (!max) return `${text}${tag}`

  const available = max - tag.length
  if (available <= 0) return text // pathological case: tag alone doesn't fit — leave text untouched rather than publish just a tag
  if (text.length <= available) return `${text}${tag}`
  return `${text.slice(0, available - 1).trimEnd()}…${tag}`
}
