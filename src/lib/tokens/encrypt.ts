// src/lib/tokens/encrypt.ts
// AES-256-GCM encryption for OAuth tokens at rest in PostgreSQL
// Tokens are sensitive — never store plaintext in DB

import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32       // 256 bits
const IV_LENGTH  = 12       // 96-bit IV for GCM
const TAG_LENGTH = 16       // 128-bit auth tag

function getKey(): Buffer {
  const secret = process.env.TOKEN_ENCRYPTION_KEY
  if (!secret) throw new Error('TOKEN_ENCRYPTION_KEY env var is not set')
  // Derive a fixed 32-byte key from the secret
  return crypto.createHash('sha256').update(secret).digest()
}

// ── Encrypt a plaintext token ─────────────────────────────────────────────
export function encryptToken(plaintext: string): string {
  const key = getKey()
  const iv  = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: TAG_LENGTH,
  } as any)

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ])
  const tag = cipher.getAuthTag()

  // Format: iv:tag:ciphertext — all base64
  return [
    iv.toString('base64'),
    tag.toString('base64'),
    encrypted.toString('base64'),
  ].join(':')
}

// ── Decrypt a stored token ────────────────────────────────────────────────
export function decryptToken(stored: string): string {
  const [ivB64, tagB64, ciphertextB64] = stored.split(':')
  if (!ivB64 || !tagB64 || !ciphertextB64) {
    throw new Error('Invalid encrypted token format')
  }

  const key        = getKey()
  const iv         = Buffer.from(ivB64, 'base64')
  const tag        = Buffer.from(tagB64, 'base64')
  const ciphertext = Buffer.from(ciphertextB64, 'base64')

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: TAG_LENGTH,
  } as any)
  decipher.setAuthTag(tag)

  return decipher.update(ciphertext) + decipher.final('utf8')
}

// ── PKCE helpers (for Twitter OAuth 2.0) ─────────────────────────────────
export function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url')
}

export function generateCodeChallenge(verifier: string): string {
  return crypto
    .createHash('sha256')
    .update(verifier)
    .digest('base64url')
}

// ── State token for CSRF protection ──────────────────────────────────────
export function generateOAuthState(workspaceId: string): string {
  const payload = JSON.stringify({ workspaceId, nonce: crypto.randomBytes(16).toString('hex') })
  return Buffer.from(payload).toString('base64url')
}

export function parseOAuthState(state: string): { workspaceId: string; nonce: string } {
  try {
    return JSON.parse(Buffer.from(state, 'base64url').toString('utf8'))
  } catch {
    throw new Error('Invalid OAuth state parameter')
  }
}
