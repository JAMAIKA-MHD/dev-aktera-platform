/**
 * Maps raw Supabase / Postgres / network errors to friendly user-facing messages.
 * Never let raw SQL error strings reach the player or operator UI.
 */

const TECHNICAL_PATTERNS: RegExp[] = [
  /\bfetch\b/i,
  /\bnetwork\b/i,
  /\b(jwt|token)\b/i,
  /\bpostgres\b/i,
  /\bsql\b/i,
  /\bconstraint\b/i,
  /\bforeign key\b/i,
  /\bnull value\b/i,
  /\bpg_\w+/i,
  /\b(500|503|504)\b/,
  /\binternal server\b/i,
  /\bexception\b/i,
  /\bstackTrace\b/i,
  /\berror code\b/i,
  /\b(PGRST|AUTH)\d+\b/i,
  /violates.*constraint/i,
  /duplicate key/i,
];

const FRIENDLY_MAP: [RegExp, string][] = [
  [/already participated/i, 'You have already participated in this campaign.'],
  [/campaign is not active/i, 'This campaign is no longer accepting entries.'],
  [/campaign not found/i, 'This campaign could not be found. Please check the link.'],
  [/invalid login credentials/i, 'Incorrect email or password. Please try again.'],
  [/email not confirmed/i, 'Please confirm your email before signing in.'],
  [/user already registered/i, 'This email is already registered. Please sign in instead.'],
  [/organization name is already/i, 'This organization name is already taken.'],
  [/email is already linked/i, 'This email is already linked to an account.'],
  [/email is already registered/i, 'This email is already registered. Please sign in instead.'],
  [/failed to record.*entry/i, 'We could not record your participation. Please try again.'],
  [/failed to reserve.*prize/i, 'Prize reservation failed. Please try again.'],
  [/network|fetch|failed to fetch/i, 'Connection issue. Please check your internet and try again.'],
  [/rate.?limit/i, 'Too many requests. Please wait a moment and try again.'],
];

/** Returns a friendly string for any error object or raw message. */
export function toFriendlyErrorMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.'
): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
      ? error
      : fallback;

  // Check known friendly mappings first
  for (const [pattern, friendly] of FRIENDLY_MAP) {
    if (pattern.test(raw)) return friendly;
  }

  // If message looks technical, return fallback
  const isTechnical = TECHNICAL_PATTERNS.some((p) => p.test(raw));
  if (isTechnical) return fallback;

  // Short, non-technical messages are safe to show
  if (raw.length < 120 && raw.trim().length > 0) return raw;

  return fallback;
}
