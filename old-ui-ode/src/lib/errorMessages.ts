interface ErrorLike {
  message?: string;
  code?: string;
}

interface FriendlyErrorOptions {
  fallback: string;
  duplicate?: string;
}

const DEFAULT_DUPLICATE_MESSAGE = 'This record already exists.';
const TECHNICAL_MESSAGE_INDICATORS = [
  'sql state',
  'postgres',
  'postgresql',
  'syntax error',
  'relation ',
  'column ',
  'constraint',
  'violates',
  'authapierror',
  'pgrst',
  'jwt',
  'stack trace',
  'exception',
  'unexpected token',
  'status code',
  'server error',
];

export const toFriendlyErrorMessage = (
  error: unknown,
  options: FriendlyErrorOptions,
): string => {
  const fallback = options.fallback;
  const duplicateMessage = options.duplicate ?? DEFAULT_DUPLICATE_MESSAGE;
  const err = error as ErrorLike;
  const message =
    typeof err?.message === 'string'
      ? err.message
      : error instanceof Error
      ? error.message
      : '';
  const code = typeof err?.code === 'string' ? err.code : '';
  const lowered = message.toLowerCase();

  if (
    code === '23505' ||
    lowered.includes('duplicate key') ||
    lowered.includes('already exists') ||
    lowered.includes('already registered') ||
    lowered.includes('already been registered')
  ) {
    return duplicateMessage;
  }

  if (
    lowered.includes('non-2xx') ||
    lowered.includes('edge function') ||
    lowered.includes('fetch failed') ||
    lowered.includes('failed to fetch') ||
    lowered.includes('network error')
  ) {
    return fallback;
  }

  if (lowered.includes('row-level security') || lowered.includes('permission denied')) {
    return 'You do not have permission to perform this action.';
  }

  if (lowered.includes('invalid login credentials')) {
    return 'Invalid email or password.';
  }

  if (lowered.includes('numeric field overflow') || code === '22003') {
    return 'Some numeric values are out of range. Please check your inputs and try again.';
  }

  if (
    lowered.includes('violates') ||
    lowered.includes('sql state') ||
    lowered.includes('postgres') ||
    lowered.includes('syntax error')
  ) {
    return fallback;
  }

  if (TECHNICAL_MESSAGE_INDICATORS.some((token) => lowered.includes(token))) {
    return fallback;
  }

  return message || fallback;
};
