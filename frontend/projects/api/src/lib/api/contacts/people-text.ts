import { NextDateView } from '../../models/contacts';

/** The words of People (docs/detailed-designs/contacts/people). */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** After this many days without a conversation, someone is drifting (known gap 99, ruled). */
export const DRIFTING_AFTER_DAYS = 30;

/** Text folded for matching: lower case, without accents. */
function folded(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

/** Whether a search matches a name: any part of it, ignoring case and accents (gap 101). */
export function matchesName(name: string, search: string): boolean {
  const typed = folded(search.trim());
  return typed.length === 0 || folded(name).includes(typed);
}

/**
 * A row's next key date: date first, in bold, when it is 30 days away or fewer ("Oct 7 ·
 * Birthday"); kind first after that ("Birthday Apr 29") (gap 101, ruled).
 */
export function nextDateLine(next: NextDateView): { date: string; what: string; near: boolean } {
  return {
    date: `${MONTHS[next.month - 1]} ${next.day}`,
    what: next.title,
    near: next.inDays <= 30,
  };
}

/**
 * When we last talked, as People's last column reads it (gaps 99 and 111, ruled): "today",
 * "yesterday", the weekday within the last 6 days, then "{n} days ago"; "Not yet" with none.
 */
export function lastTalked(on: string | null, days: number | null): string {
  if (on === null || days === null) return 'Not yet';
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days <= 6) {
    const [year, month, day] = on.split('-').map(Number);
    return WEEKDAYS[new Date(year, month - 1, day).getDay()];
  }
  return `${days} days ago`;
}

/** "No one called “Femi”" and the way to add them (L2-127 AC3). */
export function noResults(search: string): { heading: string; text: string; add: string } {
  const name = search.trim();
  return {
    heading: `No one called “${name}”`,
    text: 'Check the spelling, or add them as someone new.',
    add: `Add “${name}”`,
  };
}
