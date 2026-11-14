import { ApiContactChannel } from '../../models/auth';
import { contactProblem } from './contact-rules';

export interface ParsedContact {
  channel: ApiContactChannel;
  /** What was typed, without the spaces around it. */
  destination: string;
  /** The message of sign up for a number or an email that cannot be right (L2-006 AC4). */
  error: string | null;
}

/**
 * Sign in has one field for a phone number or an email: text with an `@` is an email, anything
 * else a phone number. While phone sign-in is switched off (`offered` is `['Email']`), everything
 * typed is checked as an email (L2-084 AC4).
 */
export function parseContact(
  raw: string,
  offered: readonly ApiContactChannel[] = ['Phone', 'Email'],
): ParsedContact {
  const destination = raw.trim();
  const email = destination.includes('@') || !offered.includes('Phone');
  const channel: ApiContactChannel = email ? 'Email' : 'Phone';
  if (!destination) {
    const error = offered.includes('Phone')
      ? 'Enter your phone number or email.'
      : 'Enter your email.';
    return { channel, destination, error };
  }
  return { channel, destination, error: contactProblem(email ? 'email' : 'phone', destination) };
}
