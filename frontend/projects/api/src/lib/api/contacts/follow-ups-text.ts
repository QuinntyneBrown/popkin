import { FollowUpView, FollowUpsFilter, TalkChannel } from '../../models/contacts';
import { parseDay } from './contact-dates-text';

export type FollowUpBucketKey = 'overdue' | 'today' | 'week' | 'later';

export interface FollowUpBucket {
  key: FollowUpBucketKey;
  heading: string;
  followUps: FollowUpView[];
}

const BUCKETS: readonly { key: FollowUpBucketKey; heading: string }[] = [
  { key: 'overdue', heading: 'Overdue' },
  { key: 'today', heading: 'Today' },
  { key: 'week', heading: 'This week' },
  { key: 'later', heading: 'Later' },
];

const CHANNELS: Record<TalkChannel, string> = {
  InPerson: 'In person',
  Phone: 'Phone',
  Video: 'Video',
  Messages: 'Messages',
};

const DAY_MS = 86_400_000;

function startOf(day: Date): Date {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate());
}

/** Whole days from today to the day: negative before it. */
function daysFrom(today: Date, day: string): number {
  return Math.round((parseDay(day).getTime() - startOf(today).getTime()) / DAY_MS);
}

/** Days from today to the coming Saturday, where "This week" ends (known gap 115, ruled). */
function daysToSaturday(today: Date): number {
  return 6 - today.getDay();
}

function bucketOf(dueOn: string | null, today: Date): FollowUpBucketKey {
  if (dueOn === null) return 'later';
  const days = daysFrom(today, dueOn);
  if (days < 0) return 'overdue';
  if (days === 0) return 'today';
  return days <= daysToSaturday(today) ? 'week' : 'later';
}

function shown(followUp: FollowUpView, filter: FollowUpsFilter): boolean {
  return filter === 'everything' || followUp.isPromise;
}

/** By day, then in the order added; those with no day last (known gap 106, ruled). */
export function byDue(a: FollowUpView, b: FollowUpView): number {
  if (a.dueOn !== b.dueOn) {
    if (a.dueOn === null) return 1;
    if (b.dueOn === null) return -1;
    return a.dueOn < b.dueOn ? -1 : 1;
  }
  return a.createdAt.localeCompare(b.createdAt);
}

/**
 * The open follow-ups the tab shows, under "Overdue", "Today", "This week" and "Later"; empty
 * buckets left out. Those in `kept`, ticked since the page opened, stay where they were, struck
 * through (L2-142 AC2).
 */
export function followUpBuckets(
  followUps: readonly FollowUpView[],
  today: Date,
  filter: FollowUpsFilter,
  kept: ReadonlySet<string> = new Set(),
): FollowUpBucket[] {
  const open = followUps
    .filter((f) => (f.doneAt === null || kept.has(f.id)) && shown(f, filter))
    .sort(byDue);
  return BUCKETS.map((b) => ({
    ...b,
    followUps: open.filter((f) => bucketOf(f.dueOn, today) === b.key),
  })).filter((b) => b.followUps.length > 0);
}

/** The done follow-ups the tab shows, most recently done first (L2-141 AC3). */
export function doneFollowUps(
  followUps: readonly FollowUpView[],
  filter: FollowUpsFilter,
  kept: ReadonlySet<string> = new Set(),
): FollowUpView[] {
  return followUps
    .filter((f) => f.doneAt !== null && !kept.has(f.id) && shown(f, filter))
    .sort((a, b) => (b.doneAt ?? '').localeCompare(a.doneAt ?? ''));
}

/** Open follow-ups due today or before: the Follow-ups tab's badge (L2-121 AC5). */
export function lateOrDueToday(followUps: readonly FollowUpView[], today: Date): number {
  return followUps.filter(
    (f) => f.doneAt === null && f.dueOn !== null && daysFrom(today, f.dueOn) <= 0,
  ).length;
}

/** The badge's name. */
export function followUpsDueLabel(count: number): string {
  return `${count} ${count === 1 ? 'follow-up' : 'follow-ups'} late or due today`;
}

/** "8 open · 6 of them promises you made", or "Nothing open". */
export function followUpsSubtitle(open: number, promises: number): string {
  if (open === 0) return 'Nothing open';
  if (promises === 0) return `${open} open`;
  const made = promises === 1 ? 'a promise' : 'promises';
  return `${open} open · ${promises} of them ${made} you made`;
}

function shortDate(day: Date): string {
  return day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function weekday(day: Date): string {
  return day.toLocaleDateString('en-US', { weekday: 'short' });
}

/** "2 days late", "1 day late", "Today", a weekday this week ("Thu") or a date ("Sep 20"). */
export function dueText(dueOn: string | null, today: Date): string | undefined {
  if (dueOn === null) return undefined;
  const days = daysFrom(today, dueOn);
  if (days < 0) return `${-days} ${days === -1 ? 'day' : 'days'} late`;
  if (days === 0) return 'Today';
  return days <= daysToSaturday(today) ? weekday(parseDay(dueOn)) : shortDate(parseDay(dueOn));
}

/**
 * "You promised · Messages, Sep 3": the day reads "today", its weekday 1 to 3 days ago ("Sat"),
 * and otherwise its date (known gap 106, ruled).
 */
export function promiseNote(followUp: FollowUpView, today: Date): string | undefined {
  if (!followUp.isPromise || followUp.promisedVia === null) return undefined;
  const via = CHANNELS[followUp.promisedVia];
  if (followUp.promisedOn === null) return `You promised · ${via}`;
  const ago = -daysFrom(today, followUp.promisedOn);
  const day = parseDay(followUp.promisedOn);
  const when = ago === 0 ? 'today' : ago >= 1 && ago <= 3 ? weekday(day) : shortDate(day);
  return `You promised · ${via}, ${when}`;
}

/** "Done Sep 10", on the device's date. */
export function doneText(doneAt: string): string {
  return `Done ${shortDate(new Date(doneAt))}`;
}

export function showDoneLabel(count: number): string {
  return `Show ${count} done`;
}
