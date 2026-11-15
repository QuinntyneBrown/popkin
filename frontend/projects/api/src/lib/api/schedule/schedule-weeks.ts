/*
 * The weeks of Schedules (docs/detailed-designs/schedules/time-off): a week runs Monday to
 * Sunday, and a day is a calendar date, `YYYY-MM-DD`, counted on the viewer's own clock.
 */

const monthNames = [
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

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** The day of a date on the device, not in UTC. */
export function isoDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** A day as a local date at noon, safe from a change of clocks. */
export function dateOf(day: string): Date {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(year, month - 1, date, 12);
}

export function addDays(day: string, days: number): string {
  const date = dateOf(day);
  date.setDate(date.getDate() + days);
  return isoDate(date);
}

/** The Monday of the week that holds the day. */
export function mondayOf(day: string): string {
  return addDays(day, -((dateOf(day).getDay() + 6) % 7));
}

/** The seven days of a week, Monday to Sunday. */
export function daysOf(monday: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

/** "Feb 15 – 21", or "Mar 29 – Apr 4" across a month; `days` long, 7 for a week, 5 for its weekdays. */
export function weekLabel(monday: string, days = 7): string {
  const first = dateOf(monday);
  const last = dateOf(addDays(monday, days - 1));
  const end =
    first.getMonth() === last.getMonth()
      ? `${last.getDate()}`
      : `${months[last.getMonth()]} ${last.getDate()}`;
  return `${months[first.getMonth()]} ${first.getDate()} – ${end}`;
}

/** The month and year a week belongs to: those of its Monday. */
export function monthOf(monday: string): { month: string; year: string } {
  const date = dateOf(monday);
  return { month: monthNames[date.getMonth()], year: String(date.getFullYear()) };
}

/** The first week of the month `step` months from the week's: the one of its first Monday. */
export function firstWeekOf(monday: string, step: number): string {
  const date = dateOf(monday);
  const first = new Date(date.getFullYear(), date.getMonth() + step, 1, 12);
  return mondayOf(addDays(isoDate(first), 6));
}

/** The weeks of the week's month: every week whose Monday is in it. */
export function weeksOfMonth(monday: string): string[] {
  const month = dateOf(monday).getMonth();
  const weeks: string[] = [];
  for (
    let week = firstWeekOf(monday, 0);
    dateOf(week).getMonth() === month;
    week = addDays(week, 7)
  ) {
    weeks.push(week);
  }
  return weeks;
}

/** Whether any day of the week is one of the event's. */
export function holdsEvent(
  monday: string,
  event: { firstDay: string; lastDay: string } | null,
): boolean {
  return !!event && event.firstDay <= addDays(monday, 6) && event.lastDay >= monday;
}

/** How far ahead time off may be entered (L2-073 AC5). */
const daysAhead = 365;

/** Whether a week's Monday is at most a year after the viewer's today, as the API counts it. */
export function isWithinAYear(monday: string, today: string): boolean {
  return monday <= addDays(today, daysAhead);
}
