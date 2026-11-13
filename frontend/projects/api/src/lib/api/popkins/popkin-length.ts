import { PopkinLength } from '../../models/popkin';

const HOUR = 60 * 60 * 1000;

/** The bounds of a chosen end: at least an hour ahead and at most a year away (L2-009 AC3). */
export function endIsAllowed(end: Date, now: Date): boolean {
  const latest = new Date(now);
  latest.setFullYear(latest.getFullYear() + 1);
  return end.getTime() - now.getTime() >= HOUR && end.getTime() <= latest.getTime();
}

/** The coming Sunday at 6 pm on the device, at least an hour ahead. */
export function comingSundayEvening(now: Date): Date {
  const sunday = new Date(now);
  sunday.setDate(now.getDate() + ((7 - now.getDay()) % 7));
  sunday.setHours(18, 0, 0, 0);
  if (sunday.getTime() - now.getTime() < HOUR) sunday.setDate(sunday.getDate() + 7);
  return sunday;
}

/**
 * When a Popkin wraps up, resolved on the device, because only the device knows its own midnight
 * and Sunday: "Just today" at the next midnight, "The weekend" on Sunday at 6 pm, "Until a date"
 * at the chosen end, and "Keep it going" never (`null`).
 */
export function resolveEndsAt(
  length: PopkinLength,
  now: Date,
  customEndsAt: Date | null,
): Date | null {
  switch (length) {
    case 'JustToday': {
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      return midnight;
    }
    case 'TheWeekend':
      return comingSundayEvening(now);
    case 'UntilDate':
      return customEndsAt ?? comingSundayEvening(now);
    case 'KeepItGoing':
      return null;
  }
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Sun, 13 Sep · 6:00 pm", the way the end date control reads. */
export function formatEnd(end: Date): string {
  const hours = end.getHours() % 12 || 12;
  const minutes = String(end.getMinutes()).padStart(2, '0');
  const half = end.getHours() < 12 ? 'am' : 'pm';
  return `${DAYS[end.getDay()]}, ${end.getDate()} ${MONTHS[end.getMonth()]} · ${hours}:${minutes} ${half}`;
}

/** `yyyy-mm-dd` and `hh:mm` on the device, for date and time fields. */
export function toDateField(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function toTimeField(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fromFields(day: string, time: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !/^\d{2}:\d{2}$/.test(time)) return null;
  const [y, m, d] = day.split('-').map(Number);
  const [h, min] = time.split(':').map(Number);
  return new Date(y, m - 1, d, h, min, 0, 0);
}
