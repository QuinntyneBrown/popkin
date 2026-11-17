import { dateOf, weekLabel } from './schedule-weeks';
import { SHORT_WEEKDAYS as weekdays } from '../text/calendar';

/*
 * What time off says (docs/detailed-designs/schedules/time-off): the count of each day and
 * whether it stands out.
 */

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

/** Monday to Friday, "Feb 15 – 19", with ", 2028" when the week is not in the viewer's year. */
export function weekdaysLabel(monday: string, today: string): string {
  const label = weekLabel(monday, 5);
  const year = monday.slice(0, 4);
  return year === today.slice(0, 4) ? label : `${label}, ${year}`;
}
