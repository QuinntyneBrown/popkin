/**
 * The local rules for a phone number or an email on sign up and sign in (L2-003 AC4, AC5).
 * The server applies the same rules; these spare a request that would be refused.
 */
export type ContactChannel = 'phone' | 'email';

/** At least the ten digits of a North American number; the mocks show United States numbers. */
const MIN_PHONE_DIGITS = 10;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function phoneDigits(value: string): string {
  return value.replace(/\D/g, '');
}

export function contactProblem(channel: ContactChannel, value: string): string | null {
  if (channel === 'phone') {
    return phoneDigits(value).length < MIN_PHONE_DIGITS ? 'That number looks a digit short.' : null;
  }
  return EMAIL.test(value.trim()) ? null : 'That email doesn’t look quite right.';
}

export function nameProblem(value: string): string | null {
  return value.trim() ? null : 'Enter a name so people know who you are.';
}
