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
