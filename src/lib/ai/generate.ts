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
  LINKEDIN:  'Professional long-form post using short paragraphs and line breaks for emphasis — NEVER markdown (no **, no #, no _ — LinkedIn displays these as literal characters, not formatting)',
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
Always make content feel authentic, locally relevant, and genuinely engaging — never generic.
Understanding Indian culture and regional languages does NOT mean defaulting to Hindi or Hinglish. The requested output language is a separate, explicit instruction in every request — follow it exactly, in every platform's text, even when the tone is "authentic" and the brand is India-focused. "Authentic" describes voice and cultural relevance, not a license to switch languages.`

  const userPrompt = `Adapt the following content for multiple social media platforms for an Indian creator/brand.

CORE CONTENT:
"""
${rawContent}
"""

SETTINGS:
- Tone: ${tone}
- Format: ${format}
- Language: ${language === 'en' ? 'ENGLISH ONLY. Zero Hindi, Hinglish, or other-language words anywhere — not in the text, not in hashtags, not in the tip. Not even a single interjection.' : `Write entirely in ${language} (script and language) — not English.`}

TARGET PLATFORMS & REQUIREMENTS:
${platformInstructions}

CRITICAL — DISTINCT PER PLATFORM: each platform's opening line must be worded differently from every other platform's. Do not reuse the same sentence, near-identical phrasing, or the same opening 5-6 words across platforms, even though the underlying idea is the same. Someone who follows this creator on two platforms should not feel like they're reading a copy-paste of the same post.

INDIA-SPECIFIC GUIDELINES:
- Use ₹ for currency, "lakh" / "crore" for numbers where appropriate
- Reference Indian context (cities, culture, platforms) naturally
- For WhatsApp: conversational, under 400 chars, emoji-friendly
- For LinkedIn: professional but warm, mention Bharat/India context
- For Instagram: use line breaks, relevant Indian hashtags, strong hook in first line
- For Twitter: thread format with 1/ 2/ 3/, punchy, no fluff
- Hashtags should include India-specific ones like #BharatBuilds #MadeInIndia where relevant

Before calling the tool, check every "text" field: is it written 100% in ${language === 'en' ? 'English, with no Hindi or Hinglish words anywhere' : language}? Fix any that aren't, then call return_adapted_content with your result — do not write JSON as plain text.`

  // Schema built from the actual requested platforms, so the API itself enforces
  // exactly those keys (no more, no less) and the correct shape for each — the
  // model literally cannot return malformed JSON here, tool calls are validated
  // and pre-parsed by the API before this code ever sees them.
  const platformOutputSchema = {
    type: 'object',
    properties: {
      text:     { type: 'string' },
      hashtags: { type: 'array', items: { type: 'string' } },
      tip:      { type: 'string' },
    },
    required: ['text', 'hashtags', 'tip'],
  }

  const response = await client.messages.create({
    model:      'claude-sonnet-5',
    max_tokens: 8000,
    // Disabled intentionally: this is a formatting task, not a reasoning one,
    // and on Sonnet 5 thinking tokens count against max_tokens — leaving it
    // on would eat into the actual response budget for no benefit here.
    thinking:   { type: 'disabled' },
    system:     systemPrompt,
    messages:   [{ role: 'user', content: userPrompt }],
    tools: [{
      name: 'return_adapted_content',
      description: 'Return the platform-adapted social media content.',
      input_schema: {
        type: 'object',
        properties: Object.fromEntries(platforms.map(p => [p, platformOutputSchema])),
        required: platforms,
        additionalProperties: false,
      },
    }],
    tool_choice: { type: 'tool', name: 'return_adapted_content' },
  })

  if (response.stop_reason === 'max_tokens') {
    throw new Error(
      `AI response was cut off before finishing (hit the ${8000}-token limit). ` +
      `Try fewer platforms per generation, or shorten the input draft.`
    )
  }

  const toolUse = response.content.find((b: any) => b.type === 'tool_use')
  if (!toolUse) {
    throw new Error('AI did not return the expected structured response — no tool_use block found.')
  }
  const parsed = (toolUse as any).input as GenerateOutput

  // Track AI usage
  await db.aiUsage.create({
    data: {
      workspaceId,
      action:       'generate_content',
      inputTokens:  response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      creditsUsed:  platforms.length,
      model:        'claude-sonnet-5',
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
    model:      'claude-sonnet-5',
    max_tokens: 500,
    thinking:   { type: 'disabled' },
    messages: [{
      role: 'user',
      content: `Generate 8-12 relevant hashtags for this ${platform} post about: "${content.slice(0, 300)}"
Include a mix of: popular Indian hashtags, niche hashtags, and evergreen ones.`,
    }],
    tools: [{
      name: 'return_hashtags',
      description: 'Return the generated hashtags.',
      input_schema: {
        type: 'object',
        properties: { hashtags: { type: 'array', items: { type: 'string' } } },
        required: ['hashtags'],
      },
    }],
    tool_choice: { type: 'tool', name: 'return_hashtags' },
  })

  const toolUse = response.content.find((b: any) => b.type === 'tool_use')
  return toolUse ? (toolUse as any).input.hashtags : []
}

// ── Content insights ────────────────────────────────────────────────────
export async function generateInsights(
  analyticsData: Record<string, unknown>,
  workspaceId: string
): Promise<Array<{ title: string; body: string; action: string; metric?: string }>> {
  const response = await client.messages.create({
    model:      'claude-sonnet-5',
    max_tokens: 2000,
    thinking:   { type: 'disabled' },
    system: 'You are a data-driven social media analyst specializing in the Indian creator economy.',
    messages: [{
      role: 'user',
      content: `Based on this analytics data for an Indian creator, generate 6 actionable insights:
${JSON.stringify(analyticsData, null, 2)}`,
    }],
    tools: [{
      name: 'return_insights',
      description: 'Return the generated insights.',
      input_schema: {
        type: 'object',
        properties: {
          insights: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title:  { type: 'string' },
                body:   { type: 'string', description: '2 sentences, India-specific' },
                action: { type: 'string', description: 'CTA text' },
                metric: { type: 'string' },
              },
              required: ['title', 'body', 'action'],
            },
          },
        },
        required: ['insights'],
      },
    }],
    tool_choice: { type: 'tool', name: 'return_insights' },
  })

  const toolUse = response.content.find((b: any) => b.type === 'tool_use')
  return toolUse ? (toolUse as any).input.insights : []
}
