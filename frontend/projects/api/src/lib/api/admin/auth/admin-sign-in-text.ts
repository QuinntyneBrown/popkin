import { contactProblem } from '../../auth/contact-rules';

/** A wrong code, and how many tries are left before the console locks (L2-088 AC5). */
export function mismatchText(attemptsLeft: number): string {
  const tries = attemptsLeft === 1 ? '1 try' : `${attemptsLeft} tries`;
  return `That code doesn’t match. ${tries} left before the console locks for 15 minutes.`;
}

/** When a locked email may try again, at its time where the admin is (L2-088 AC6). */
export function lockedText(lockedUntil: string | undefined, timeZone: string): string {
  const until = lockedUntil ? new Date(lockedUntil) : null;
  if (!until || Number.isNaN(until.getTime())) {
    return 'Try again in 15 minutes, or ask an Owner to check your account.';
  }
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(until);
  return `Try again at ${time}, or ask an Owner to check your account.`;
}

/** The field's error and the summary's link for an email that is not a whole address (L2-088 AC2). */
export interface EmailProblem {
  error: string;
  summary: string;
}

export function emailProblem(typed: string): EmailProblem | null {
  const email = typed.trim();
  const error = 'Enter a whole email address, like name@popkin.app.';
  if (!email) return { error, summary: 'Enter your staff email' };
  return contactProblem('email', email)
    ? { error, summary: 'Staff email is missing its ending' }
    : null;
}
