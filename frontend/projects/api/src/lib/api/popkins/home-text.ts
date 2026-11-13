import { timeLeft } from './time-left';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEK_MS = 7 * 24 * 60 * 60_000;

/** The time of day as the device reads it: "6 pm", "6:30 pm". */
export function clock(at: Date): string {
  const hours = at.getHours() % 12 || 12;
  const minutes = at.getMinutes() ? `:${String(at.getMinutes()).padStart(2, '0')}` : '';
  return `${hours}${minutes} ${at.getHours() < 12 ? 'am' : 'pm'}`;
}

/**
 * When a Popkin wraps up, on the device: "Wraps up Sun, 6 pm". Within a week the weekday says
 * which day; further away the date does, with the year when it is not this one.
 */
export function wrapsUp(endsAt: Date, now: Date): string {
  if (endsAt.getTime() - now.getTime() < WEEK_MS) {
    return `Wraps up ${DAYS[endsAt.getDay()]}, ${clock(endsAt)}`;
  }
  const year = endsAt.getFullYear() === now.getFullYear() ? '' : ` ${endsAt.getFullYear()}`;
  return `Wraps up ${endsAt.getDate()} ${MONTHS[endsAt.getMonth()]}${year}, ${clock(endsAt)}`;
}

/**
 * The header's line for a Popkin with an end (L2-019 AC1, L2-044 AC5): "1 day 6 hrs left ·
 * Wraps up Sun, 6 pm". Null for a Popkin that keeps going, and once the end has passed.
 */
export function timeLeftLine(endsAt: string | null, now: Date): string | null {
  if (!endsAt) return null;
  const end = new Date(endsAt);
  const left = timeLeft(end, now);
  return left ? `${left} · ${wrapsUp(end, now)}` : null;
}

export function membersLabel(count: number): string {
  return count === 1 ? '1 member' : `${count} members`;
}

export function photosMeta(count: number): string {
  return count === 1 ? '1 photo' : `${count} photos`;
}

export function experiencesMeta(count: number): string {
  return `${count} shared`;
}

export function newLabel(count: number): string {
  return `${count} new`;
}

/** "4.8 · 11 ratings": the score to one decimal place and how many gave one. */
export function ratingLabel(average: number, ratingCount: number): string {
  return `${average.toFixed(1)} · ${ratingCount === 1 ? '1 rating' : `${ratingCount} ratings`}`;
}

/** A member's name in the list; the viewer's own carries "(you)". */
export function memberName(displayName: string, isViewer: boolean): string {
  return isViewer ? `${displayName} (you)` : displayName;
}
