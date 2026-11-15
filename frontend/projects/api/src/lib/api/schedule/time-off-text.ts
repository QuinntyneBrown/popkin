import { dateOf } from './schedule-weeks';

/*
 * What time off says (docs/detailed-designs/schedules/time-off): the count of each day and
 * whether it stands out.
 */

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** "5 of 6 off" (L2-072 AC4). */
export function offCount(off: number, members: number): string {
  return `${off} of ${members} off`;
}

/** The count is bold when every member but at most one is off (L2-072 AC6). */
export function isMany(off: number, members: number): boolean {
  return off > 0 && off >= members - 1;
}

/** A day's heading: "Mon" over "15". */
export function dayHeading(day: string): { weekday: string; date: string } {
  const date = dateOf(day);
  return { weekday: weekdays[date.getDay()], date: String(date.getDate()) };
}
