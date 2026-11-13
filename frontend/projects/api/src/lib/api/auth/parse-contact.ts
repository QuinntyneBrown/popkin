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
 * else a phone number.
 */
export function parseContact(raw: string): ParsedContact {
  const destination = raw.trim();
  const email = destination.includes('@');
  const channel: ApiContactChannel = email ? 'Email' : 'Phone';
  if (!destination) return { channel, destination, error: 'Enter your phone number or email.' };
  return { channel, destination, error: contactProblem(email ? 'email' : 'phone', destination) };
}
