import { describe, it, expect, beforeAll } from 'vitest'
import {
  encryptToken,
  decryptToken,
  generateCodeVerifier,
  generateCodeChallenge,
  generateOAuthState,
  parseOAuthState,
} from '@/lib/tokens/encrypt'
import crypto from 'crypto'

beforeAll(() => {
  process.env.TOKEN_ENCRYPTION_KEY = 'test-key-not-for-production-use-only'
})

describe('token encryption (AES-256-GCM)', () => {
  it('round-trips a plaintext token', () => {
    const plaintext = 'super-secret-oauth-access-token-12345'
    const encrypted = encryptToken(plaintext)
    expect(encrypted).not.toBe(plaintext)
    expect(decryptToken(encrypted)).toBe(plaintext)
  })

  it('produces a different ciphertext each time (random IV)', () => {
    const plaintext = 'same-input-both-times'
    const a = encryptToken(plaintext)
    const b = encryptToken(plaintext)
    expect(a).not.toBe(b)
    expect(decryptToken(a)).toBe(plaintext)
    expect(decryptToken(b)).toBe(plaintext)
  })

  it('rejects a tampered ciphertext (auth tag check fails)', () => {
    const encrypted = encryptToken('some-token')
    const [iv, tag, ciphertext] = encrypted.split(':')
    const tamperedCiphertext = Buffer.from(ciphertext, 'base64')
    tamperedCiphertext[0] ^= 0xff
    const tampered = [iv, tag, tamperedCiphertext.toString('base64')].join(':')
    expect(() => decryptToken(tampered)).toThrow()
  })

  it('rejects a malformed stored value', () => {
    expect(() => decryptToken('not-a-valid-stored-token')).toThrow('Invalid encrypted token format')
  })
})

describe('PKCE helpers', () => {
  it('generates a verifier and a matching S256 challenge', () => {
    const verifier = generateCodeVerifier()
    const challenge = generateCodeChallenge(verifier)
    const expected = crypto.createHash('sha256').update(verifier).digest('base64url')
    expect(challenge).toBe(expected)
  })

  it('generates a different verifier each call', () => {
    expect(generateCodeVerifier()).not.toBe(generateCodeVerifier())
  })
})

describe('OAuth state (CSRF token)', () => {
  it('round-trips the workspaceId through encode/decode', () => {
    const state = generateOAuthState('workspace_abc123')
    const parsed = parseOAuthState(state)
    expect(parsed.workspaceId).toBe('workspace_abc123')
    expect(typeof parsed.nonce).toBe('string')
  })

  it('throws on a garbage state value', () => {
    expect(() => parseOAuthState('not-valid-base64url-json')).toThrow('Invalid OAuth state parameter')
  })
})
