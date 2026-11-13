import { LatestMessageView } from '../../models/my-popkins';
import { timeLeft } from './time-left';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEK_MS = 7 * 24 * 60 * 60_000;

/** "Nov 30", with the year when it is not this one. */
function monthDay(date: Date, now: Date): string {
  const day = `${MONTHS[date.getMonth()]} ${date.getDate()}`;
  return date.getFullYear() === now.getFullYear() ? day : `${day}, ${date.getFullYear()}`;
}

/**
 * What a card says of the time a Popkin has (L2-017 AC1, L2-044 AC5): "Ongoing" with no end, the
 * time left in its largest two units within a week, the date beyond it, and "Wrapping up" once
 * the end has passed and the Popkin has not wrapped up yet.
 */
export function cardTimeLeft(endsAt: string | null, now: Date): string {
  if (!endsAt) return 'Ongoing';
  const end = new Date(endsAt);
  if (end.getTime() - now.getTime() >= WEEK_MS) return `Until ${monthDay(end, now)}`;
  return timeLeft(end, now) ?? 'Wrapping up';
}

/** The badge of a card: the count, "99+" above 99, nothing at zero (L2-017 AC2). */
export function unreadBadge(count: number): string | null {
  if (count <= 0) return null;
  return count > 99 ? '99+' : String(count);
}

/** What the badge counts, for assistive technology (L2-017 AC2). */
export function unreadLabel(count: number): string | null {
  if (count <= 0) return null;
  if (count > 99) return 'More than 99 unread messages';
  return count === 1 ? '1 unread message' : `${count} unread messages`;
}

/** "Mara: last call for the canoe sign-up" (L2-017 AC1). */
export function latestLine(latest: LatestMessageView | null): string {
  return latest ? `${latest.firstName}: ${latest.text}` : 'No messages yet';
}

/** "Wrapped Mar 8 · 48 people · 312 photos" (L2-018 AC1). */
export function wrappedLine(
  wrappedUpAt: string,
  people: number,
  photos: number,
  now: Date,
): string {
  return [
    `Wrapped ${monthDay(new Date(wrappedUpAt), now)}`,
    people === 1 ? '1 person' : `${people} people`,
    photos === 1 ? '1 photo' : `${photos} photos`,
  ].join(' · ');
}

/** The name of the avatar that opens the account (L2-017 AC5). */
export function accountLabel(name: string): string {
  return `Your account, ${name}`;
}
