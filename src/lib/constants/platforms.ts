// src/lib/constants/platforms.ts
// Shared platform display metadata — colors and human labels — used across
// the dashboard, studio, library, and scheduler pages. Centralized so the
// same platform always looks the same everywhere instead of each page
// keeping its own slightly-different copy of this map.

export const PLATFORM_COLORS: Record<string, string> = {
  instagram: '#E1306C', twitter: '#1DA1F2', linkedin: '#0077B5',
  youtube: '#FF0000', facebook: '#1877F2', whatsapp: '#25D366',
}

// Same map, keyed by the uppercase SocialPlatform enum value used in the DB
// (Post/PostPlatform/SocialAccount) rather than the lowercase key Studio's
// UI state uses.
export const PLATFORM_COLORS_BY_ENUM: Record<string, string> = {
  INSTAGRAM: '#E1306C', TWITTER: '#1DA1F2', LINKEDIN: '#0077B5',
  YOUTUBE: '#FF0000', FACEBOOK: '#1877F2', WHATSAPP: '#25D366',
}

export const PLATFORM_LABELS: Record<string, string> = {
  YOUTUBE: 'YouTube', INSTAGRAM: 'Instagram', TWITTER: 'X/Twitter',
  LINKEDIN: 'LinkedIn', FACEBOOK: 'Facebook', WHATSAPP: 'WhatsApp',
}

// PostStatus / PostPlatform status → display color, used for badges in the
// Content Library, Scheduler, and Notifications feed.
export const STATUS_COLORS: Record<string, string> = {
  DRAFT: '#7A7A90',
  SCHEDULED: '#FBBF24',
  PUBLISHING: '#60A5FA',
  PUBLISHED: '#34D399',
  PARTIAL: '#FB923C',
  FAILED: '#F87171',
  CANCELLED: '#5A5A72',
}

export const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  SCHEDULED: 'Scheduled',
  PUBLISHING: 'Publishing',
  PUBLISHED: 'Published',
  PARTIAL: 'Partially published',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled',
}
