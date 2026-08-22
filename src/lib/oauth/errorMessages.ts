// src/lib/oauth/errorMessages.ts
//
// Every OAuth callback route (Instagram/Twitter/LinkedIn) redirects failures
// to /settings?platform=...&error=... with either a known short code
// (missing_params, state_mismatch, no_verifier, no_instagram_business_account)
// or a raw third-party error string (Meta/LinkedIn/Twitter API error text,
// or the user's own "access_denied"). Until now PlatformConnector just
// toasted that raw value directly — e.g. "Instagram connection failed:
// no_instagram_business_account" — which is not something a real customer
// can act on. This maps each known case to a plain-English explanation and,
// where there's a concrete next step, a link.
//
// See claude/vyralbro-customer-onboarding-notes.md for the specific error
// modes this was designed against.

export interface ExplainedOAuthError {
  headline: string
  detail:   string
  linkHref?: string
  linkText?: string
}

const PLATFORM_NAMES: Record<string, string> = {
  instagram: 'Instagram',
  twitter:   'X / Twitter',
  linkedin:  'LinkedIn',
}

// Exact-code matches — these are strings our own callback routes emit
// on purpose, so we know precisely what happened.
const KNOWN_CODES: Record<string, ExplainedOAuthError> = {
  missing_params: {
    headline: 'Connection didn’t finish',
    detail:   'Something interrupted the process before it completed. Please try connecting again.',
  },
  state_mismatch: {
    headline: 'Connection request expired',
    detail:   'This can happen if the connect link sat open too long, or if it was opened in a different browser/tab. Try clicking Connect again.',
  },
  no_verifier: {
    headline: 'Connection request expired',
    detail:   'This can happen if the connect link sat open too long. Try clicking Connect again.',
  },
  no_instagram_business_account: {
    headline: 'No Instagram Business account found',
    detail:   'We couldn’t find an Instagram Business or Creator account linked to a Facebook Page you manage. VyralBro can only publish to Business/Creator accounts (not personal Instagram accounts).',
    linkHref: 'https://help.instagram.com/502981923235522',
    linkText: 'How to switch to a Business account →',
  },
  auth_required: {
    headline: 'Please sign in first',
    detail:   'You need to be signed in to VyralBro before connecting a platform.',
  },
}

// Substring heuristics for the raw error text platforms hand back, when it's
// not one of our own short codes. Checked in order — first match wins.
const PATTERN_RULES: Array<{ test: RegExp; explain: (platform: string) => ExplainedOAuthError }> = [
  {
    test: /denied|cancel/i,
    explain: (platform) => ({
      headline: 'Permission not granted',
      detail:   `You didn’t approve the request, so nothing was connected. Click Connect ${PLATFORM_NAMES[platform] ?? platform} again if you’d like to try once more.`,
    }),
  },
  {
    test: /scope/i,
    explain: () => ({
      headline: 'We hit a configuration issue on our end',
      detail:   'This isn’t something you did — our app’s permission request was malformed. We’ve logged it; please try again in a few minutes, and contact us if it persists.',
    }),
  },
  {
    test: /workspace/i,
    explain: () => ({
      headline: 'Couldn’t find your workspace',
      detail:   'Please sign out and back in, then try connecting again.',
    }),
  },
  {
    test: /url|redirect|domain/i,
    explain: () => ({
      headline: 'We hit a configuration issue on our end',
      detail:   'This is a VyralBro-side setup problem, not anything wrong on your account. We’ve been notified — please try again shortly.',
    }),
  },
]

/**
 * Turn whatever string an OAuth callback redirect put in ?error= into a
 * plain-English explanation. Falls back to a friendly wrapper around the
 * raw message (rather than hiding it entirely) when nothing matches, so we
 * never lose diagnostic detail — we just don't lead with it.
 */
export function explainOAuthError(platform: string, rawError: string): ExplainedOAuthError {
  const known = KNOWN_CODES[rawError]
  if (known) return known

  for (const rule of PATTERN_RULES) {
    if (rule.test.test(rawError)) return rule.explain(platform)
  }

  const platformName = PLATFORM_NAMES[platform] ?? platform
  return {
    headline: `Couldn’t connect ${platformName}`,
    detail:   `Something went wrong on ${platformName}’s side: “${rawError}”. Please try again — if it keeps happening, let us know and mention this exact message.`,
  }
}
