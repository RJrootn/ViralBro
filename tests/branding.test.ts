import { describe, it, expect } from 'vitest'
import { shouldApplyBranding, applyBranding } from '@/lib/billing/branding'

describe('shouldApplyBranding', () => {
  it('applies to FREE and CREATOR', () => {
    expect(shouldApplyBranding('FREE')).toBe(true)
    expect(shouldApplyBranding('CREATOR')).toBe(true)
  })

  it('does not apply to PRO or AGENCY', () => {
    expect(shouldApplyBranding('PRO')).toBe(false)
    expect(shouldApplyBranding('AGENCY')).toBe(false)
  })
})

describe('applyBranding', () => {
  it('appends the tag when there is plenty of room', () => {
    const result = applyBranding('Great post about SaaS', 'LINKEDIN')
    expect(result).toContain('Great post about SaaS')
    expect(result).toContain('Made with VyralBro')
  })

  it('always includes the tag on Twitter even for a near-limit post, by trimming the body', () => {
    const longPost = 'x'.repeat(275) // already near Twitter's 280-char cap
    const result = applyBranding(longPost, 'TWITTER')
    expect(result).toContain('Made with VyralBro')
    expect(result.length).toBeLessThanOrEqual(280)
  })

  it('never exceeds the platform max length', () => {
    const longPost = 'y'.repeat(3000)
    const result = applyBranding(longPost, 'INSTAGRAM')
    expect(result.length).toBeLessThanOrEqual(2200)
    expect(result).toContain('Made with VyralBro')
  })

  it('leaves text unbranded (rather than truncating away the whole post) when a platform has no configured max', () => {
    const post = 'A perfectly normal LinkedIn-length post.'
    const result = applyBranding(post, 'LINKEDIN')
    expect(result.startsWith(post)).toBe(true)
  })
})
