// src/lib/ai/generate.ts
// Vyral AI content engine — powered by Claude

import Anthropic from '@anthropic-ai/sdk'
import { db }    from '@/lib/db/client'
import type { SocialPlatform } from '@prisma/client'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

// ── Platform character limits ─────────────────────────────────────────────
export const PLATFORM_LIMITS: Record<SocialPlatform, number> = {
  INSTAGRAM: 2200,
  TWITTER:   280,
  LINKEDIN:  3000,
  YOUTUBE:   5000,
  FACEBOOK:  63206,
  WHATSAPP:  1000,
}

export const PLATFORM_FORMAT: Record<SocialPlatform, string> = {
  INSTAGRAM: 'Reels caption with line breaks and hashtags',
  TWITTER:   'Punchy thread (use 1/ 2/ 3/ numbering)',
  LINKEDIN:  'Professional long-form post with bold headings',
  YOUTUBE:   'Short description (500 chars max) with keywords',
  FACEBOOK:  'Conversational page post with CTA',
  WHATSAPP:  'Concise broadcast message under 400 chars',
}

// ── Types ─────────────────────────────────────────────────────────────────
export interface GenerateInput {
  rawContent:  string
  tone:        string
  format:      string
  language:    string
  platforms:   SocialPlatform[]
  workspaceId: string
}

export interface PlatformOutput {
  text:     string
  hashtags: string[]
  tip:      string
}

export type GenerateOutput = Partial<Record<SocialPlatform, PlatformOutput>>

// ── Main generation function ──────────────────────────────────────────────
export async function generateContent(input: GenerateInput): Promise<GenerateOutput> {
  const { rawContent, tone, format, language, platforms, workspaceId } = input

  const platformInstructions = platforms.map(p =>
    `- ${p}: ${PLATFORM_FORMAT[p]} (max ${PLATFORM_LIMITS[p]} chars)`
  ).join('\n')

  const systemPrompt = `You are an expert social media strategist for Indian creators and businesses.
You deeply understand the Bharat market — tier-1 to tier-3 cities, regional languages, WhatsApp culture, Indian B2B dynamics, ₹ pricing, and the pulse of Indian social media.
Always make content feel authentic, locally relevant, and genuinely engaging — never generic.`

  const userPrompt = `Adapt the following content for multiple social media platforms for an Indian creator/brand.

CORE CONTENT:
"""
${rawContent}
"""

SETTINGS:
- Tone: ${tone}
- Format: ${format}
- Language: ${language} (write the post text in this language/script if not English)

TARGET PLATFORMS & REQUIREMENTS:
${platformInstructions}

INDIA-SPECIFIC GUIDELINES:
- Use ₹ for currency, "lakh" / "crore" for numbers where appropriate
- Reference Indian context (cities, culture, platforms) naturally
- For WhatsApp: conversational, under 400 chars, emoji-friendly
- For LinkedIn: professional but warm, mention Bharat/India context
- For Instagram: use line breaks, relevant Indian hashtags, strong hook in first line
- For Twitter: thread format with 1/ 2/ 3/, punchy, no fluff
- Hashtags should include India-specific ones like #BharatBuilds #MadeInIndia where relevant

Return ONLY a valid JSON object (no markdown fences, no explanation) with this exact shape:
{
  "${platforms[0]}": {
    "text": "...",
    "hashtags": ["#tag1", "#tag2"],
    "tip": "one short India-specific posting tip (max 12 words)"
  }${platforms.length > 1 ? `,
  // ... same for: ${platforms.slice(1).join(', ')}` : ''}
}`

  const response = await client.messages.create({
    model:      'claude-sonnet-4-20250514',
    max_tokens: 2000,
    system:     systemPrompt,
    messages:   [{ role: 'user', content: userPrompt }],
  })

  const raw = response.content
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('')

  const cleaned = raw.replace(/```json|```/g, '').trim()
  const parsed: GenerateOutput = JSON.parse(cleaned)

  // Track AI usage
  await db.aiUsage.create({
    data: {
      workspaceId,
      action:       'generate_content',
      inputTokens:  response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      creditsUsed:  platforms.length,
      model:        'claude-sonnet-4-20250514',
    },
  })

  return parsed
}

// ── Hashtag generation ────────────────────────────────────────────────────
export async function generateHashtags(
  content: string,
  platform: SocialPlatform,
  workspaceId: string
): Promise<string[]> {
  const response = await client.messages.create({
    model:      'claude-sonnet-4-20250514',
    max_tokens: 200,
    messages: [{
      role: 'user',
      content: `Generate 8-12 relevant hashtags for this ${platform} post about: "${content.slice(0, 300)}"
Include a mix of: popular Indian hashtags, niche hashtags, and evergreen ones.
Return ONLY a JSON array of strings like ["#tag1", "#tag2"].`,
    }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : '[]'
  const cleaned = text.replace(/```json|```/g, '').trim()
  return JSON.parse(cleaned)
}

// ── Content insights ──────────────────────────────────────────────────────
export async function generateInsights(
  analyticsData: Record<string, unknown>,
  workspaceId: string
): Promise<Array<{ title: string; body: string; action: string; metric?: string }>> {
  const response = await client.messages.create({
    model:      'claude-sonnet-4-20250514',
    max_tokens: 1000,
    system: 'You are a data-driven social media analyst specializing in the Indian creator economy.',
    messages: [{
      role: 'user',
      content: `Based on this analytics data for an Indian creator, generate 6 actionable insights:
${JSON.stringify(analyticsData, null, 2)}

Return ONLY a JSON array of objects with: { title, body (2 sentences, India-specific), action (CTA text), metric (key number) }`,
    }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : '[]'
  return JSON.parse(text.replace(/```json|```/g, '').trim())
}
