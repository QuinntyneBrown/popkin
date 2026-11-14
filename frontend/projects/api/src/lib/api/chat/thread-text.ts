/**
 * The words of a thread, built from what the API answers. Days and times are read on the
 * device, as the member lives them.
 */
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY = 24 * 60 * 60 * 1000;

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** The divider over a day's messages: "Today", "Yesterday", the weekday, then the date (L2-021 AC4). */
export function dayLabel(sentAt: Date, now: Date): string {
  const days = Math.round((startOfDay(now) - startOfDay(sentAt)) / DAY);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return WEEKDAYS[sentAt.getDay()];
  const day = `${sentAt.getDate()} ${MONTHS[sentAt.getMonth()]}`;
  return sentAt.getFullYear() === now.getFullYear() ? day : `${day} ${sentAt.getFullYear()}`;
}

/** The time beside a message, as the mocks write it: "9:24". */
export function messageTime(sentAt: Date): string {
  return `${sentAt.getHours() % 12 || 12}:${String(sentAt.getMinutes()).padStart(2, '0')}`;
}

/** The line under the Popkin's name: "14 members · 5 here now" (L2-021 AC1). */
export function threadSub(memberCount: number, hereNow: number): string {
  if (memberCount <= 1) return 'Just you so far';
  const members = `${memberCount} members`;
  return hereNow > 0 ? `${members} · ${hereNow} here now` : members;
}

/** "and 9 others in this Popkin" under the people listed as here now, or null when all are. */
export function othersHere(memberCount: number, listed: number): string | null {
  const others = memberCount - listed;
  if (others <= 0) return null;
  return `and ${others} ${others === 1 ? 'other' : 'others'} in this Popkin`;
}

/** A message's line where one line stands for it: its text, or "Photo" for a photo alone (L2-026). */
export function messageLine(message: { text: string; photo: unknown }): string {
  return message.text || (message.photo ? 'Photo' : '');
}

/** What assistive technology hears when a message arrives: its sender, then its text (L2-027 AC6). */
export function announcement(firstName: string, text: string): string {
  return `${firstName}: ${text}`;
}

const POPPED_IN = ' popped in';

/** A note's name, set apart so it can be stressed: "Joel Park" and " popped in. Say hi! 👋". */
export function noteParts(text: string): { name: string; text: string } {
  const at = text.indexOf(POPPED_IN);
  return at > 0 ? { name: text.slice(0, at), text: text.slice(at) } : { name: '', text };
}
