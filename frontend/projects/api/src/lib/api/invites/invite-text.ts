/**
 * The sentences of joining by invite, built from what the API answers. Days and times are read
 * on the device, as the person will live them.
 */
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY = 24 * 60 * 60 * 1000;

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** Whole days from `now`'s day to `date`'s day: 0 today, 1 tomorrow, -1 yesterday. */
function daysApart(date: Date, now: Date): number {
  return Math.round((startOfDay(date) - startOfDay(now)) / DAY);
}

/** "today", a weekday within the week either side, else "19 Sep", with the year when it differs. */
function dayName(date: Date, now: Date): string {
  const days = daysApart(date, now);
  if (days === 0) return 'today';
  if (Math.abs(days) < 7) return WEEKDAYS[date.getDay()];
  const day = `${date.getDate()} ${MONTHS[date.getMonth()]}`;
  return date.getFullYear() === now.getFullYear() ? day : `${day} ${date.getFullYear()}`;
}

/** "6 pm", "11:30 pm", "12 am". */
function clockTime(date: Date): string {
  const hours = date.getHours() % 12 || 12;
  const minutes = date.getMinutes() ? `:${String(date.getMinutes()).padStart(2, '0')}` : '';
  return `${hours}${minutes} ${date.getHours() < 12 ? 'am' : 'pm'}`;
}

/** When an active Popkin wraps up, as the invite says it: "Here until Sunday, 6 pm" (L2-012 AC1). */
export function hereUntil(endsAt: Date, now: Date): string {
  return `Here until ${dayName(endsAt, now)}, ${clockTime(endsAt)}`;
}

/** The sentence on an invite to a wrapped-up Popkin, naming who to ask (L2-016 AC1). */
export function wrappedUpLine(wrappedUpAt: Date, inviter: string, now: Date): string {
  const day = dayName(wrappedUpAt, now);
  const when = day === 'today' ? day : `on ${day}`;
  return `This Popkin wrapped up ${when}. What a time. Ask ${inviter} for the next one.`;
}

/** "1 person", "14 people". */
export function peopleCount(count: number): string {
  return count === 1 ? '1 person' : `${count} people`;
}

/** The welcome: two members named and the rest counted (L2-014 AC1). */
export function welcomeLine(popkinName: string, named: readonly string[], others: number): string {
  const rest = others === 0 ? [] : [others === 1 ? '1 other' : `${others} others`];
  const names = [...named, ...rest];
  if (names.length === 0) return `You’re now part of ${popkinName}.`;
  const last = names[names.length - 1];
  const listed = names.length === 1 ? last : `${names.slice(0, -1).join(', ')} and ${last}`;
  return `You’re now part of ${popkinName}, with ${listed}.`;
}

/** "and 6 more" under the members shown, or null when everyone is shown. */
export function andMore(count: number): string | null {
  return count > 0 ? `and ${count} more` : null;
}
