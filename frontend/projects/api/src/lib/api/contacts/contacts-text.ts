/** The words every Contacts page shares (docs/detailed-designs/contacts/open-contacts). */

/** The line under "Contacts" in its navigation (L2-121 AC3). */
export function countLine(people: number): string {
  if (people === 0) return 'Only you can see them';
  return people === 1 ? '1 person · only you' : `${people} people · only you`;
}

/** Today's heading, by the hour on the device: "Morning, Mara" (L2-125 AC1). */
export function greeting(name: string, now: Date): string {
  const hour = now.getHours();
  const part = hour < 12 ? 'Morning' : hour < 18 ? 'Afternoon' : 'Evening';
  return `${part}, ${name.trim().split(/\s+/)[0]}`;
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** A day in full, as Today's date line: "Tuesday, 15 September" (L2-125 AC1). */
export function longDay(day: Date): string {
  return `${WEEKDAYS[day.getDay()]}, ${day.getDate()} ${MONTHS[day.getMonth()]}`;
}

/** The first word of a contact's name: the only way Contacts names them (L2-122 AC4). */
export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? '';
}

/** "Chidi’s", "Tomás’s": a contact's first name as the owner of something. */
export function possessive(first: string): string {
  return `${first}’s`;
}

/** What a link to a contact not in my Contacts shows, and nothing else (L2-122 AC2). */
export const NOT_FOUND_TEXT = {
  heading: 'This person isn’t in your contacts',
  text: 'They may have been deleted, or the link came from someone else’s contacts. Only you can see yours.',
} as const;

/** Whether an address's id can name a contact at all; one that cannot is not asked for. */
export function isContactId(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

/** The device's day as the API reads it, `?on=2026-09-15` (open-contacts design). */
export function dayParam(day: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`;
}

/** People's line under its heading (L2-126 AC1, AC4). */
export function contactsPeopleLine(people: number): string {
  if (people === 0) return 'Only you can see them';
  return `${people === 1 ? '1 person' : `${people} people`} · only you can see them`;
}
