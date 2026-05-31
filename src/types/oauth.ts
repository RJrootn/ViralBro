// src/types/oauth.ts
// Shared OAuth types for all social platforms

export type SocialPlatform = 'INSTAGRAM' | 'TWITTER' | 'LINKEDIN' | 'YOUTUBE' | 'FACEBOOK' | 'WHATSAPP'

export interface OAuthTokens {
  accessToken:    string
  refreshToken?:  string
  tokenExpiresAt?: Date
  scopes:         string[]
}

export interface PlatformProfile {
  platformUserId:   string
  platformUsername: string
  displayName?:     string
  avatarUrl?:       string
  followersCount?:  number
  followingCount?:  number
  verified?:        boolean
}

export interface ConnectedAccount {
  id:               string
  platform:         SocialPlatform
  platformUsername: string
  displayName?:     string | null
  avatarUrl?:       string | null
  isActive:         boolean
  connectedAt:      string
  tokenExpiresAt?:  string | null
  followersCount?:  number | null
}

// ── Platform OAuth config ───────────────────────────────────────────────
export const PLATFORM_CONFIG = {
  INSTAGRAM: {
    name:        'Instagram',
    color:       '#E1306C',
    authUrl:     'https://www.facebook.com/v19.0/dialog/oauth',
    tokenUrl:    'https://graph.facebook.com/v19.0/oauth/access_token',
    apiBase:     'https://graph.facebook.com/v19.0',
    scopes: [
      'instagram_basic',
      'instagram_content_publish',
      'instagram_manage_insights',
      'pages_read_engagement',
      'pages_manage_posts',
    ],
    supportsRefresh:  false, // long-lived tokens (60 days)
    tokenLifespanDays: 60,
  },
  TWITTER: {
    name:        'X / Twitter',
    color:       '#1DA1F2',
    authUrl:     'https://twitter.com/i/oauth2/authorize',
    tokenUrl:    'https://api.twitter.com/2/oauth2/token',
    apiBase:     'https://api.twitter.com/2',
    scopes: [
      'tweet.read',
      'tweet.write',
      'users.read',
      'offline.access',   // enables refresh token
    ],
    supportsRefresh:  true,
    tokenLifespanDays: 2, // short-lived, refresh automatically
  },
  LINKEDIN: {
    name:        'LinkedIn',
    color:       '#0077B5',
    authUrl:     'https://www.linkedin.com/oauth/v2/authorization',
    tokenUrl:    'https://www.linkedin.com/oauth/v2/accessToken',
    apiBase:     'https://api.linkedin.com/v2',
    scopes: [
      'r_liteprofile',
      'r_emailaddress',
      'w_member_social',
    ],
    supportsRefresh:  true,
    tokenLifespanDays: 60,
  },
} as const
