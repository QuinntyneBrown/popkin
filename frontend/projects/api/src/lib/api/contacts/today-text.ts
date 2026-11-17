import { KeyDateRowView } from '../../models/contacts';
import { DriftingView, RecentEntryView } from '../../models/today';
import { parseDay } from './contact-dates-text';
import { channelLabel } from './log-entry-text';
import {
  LONG_WEEKDAYS,
  SHORT_MONTHS as MONTHS,
  SHORT_WEEKDAYS as WEEKDAYS,
} from '../text/calendar';
import { capitalised, daysAway } from '../text/relative-day';

function joined(words: readonly string[]): string {
  return words.length === 1 ? words[0] : `${words.slice(0, -1).join(', ')} and ${words.at(-1)}`;
}

/** The spotlight's day: "Today", "Tomorrow", else "Saturday · in 4 days" (known gap 111, ruled). */
export function spotlightWhen(date: Pick<KeyDateRowView, 'occursOn' | 'daysLeft'>): string {
  if (date.daysLeft === 0 || date.daysLeft === 1) return capitalised(daysAway(date.daysLeft));
  return `${LONG_WEEKDAYS[parseDay(date.occursOn).getDay()]} · ${daysAway(date.daysLeft)}`;
}

/** A Coming up row's days: "Today", "Tomorrow" or "{n} days". */
export function comingUpDays(daysLeft: number): string {
  if (daysLeft === 0) return 'Today';
  if (daysLeft === 1) return 'Tomorrow';
  return `${daysLeft} days`;
}

/** The spotlight's line under the title: "Turns 33 · Best friend from uni". */
export function spotlightSub(line: string | undefined, knownAs: string | null): string | undefined {
  const parts = [line, knownAs ?? undefined].filter((p): p is string => !!p);
  return parts.length ? parts.join(' · ') : undefined;
}

/** What they love, after "Grace is into": "pottery, natural wine and Sunday markets." */
export function lovesLine(loves: readonly string[]): string | undefined {
  if (loves.length === 0) return undefined;
  const words = loves.map((l, i) => (i === 0 ? l.charAt(0).toLowerCase() + l.slice(1) : l));
  return `${joined(words)}.`;
}

/**
 * A Recently row's title: a conversation by its channel ("Ada · Phone"), a milestone by its
 * title ("Dev · Moved to Chapel Allerton").
 */
export function recentTitle(entry: RecentEntryView): string {
  const how =
    entry.kind === 'Milestone'
      ? (entry.title ?? '')
      : entry.channel
        ? channelLabel(entry.channel)
        : '';
  return how ? `${entry.firstName} · ${how}` : entry.firstName;
}

/** When an entry was: "Today", the weekday within the last 6 days ("Sun"), else the date ("Sep 7"). */
export function recentWhen(entry: Pick<RecentEntryView, 'day' | 'daysAgo'>): string {
  const day = parseDay(entry.day);
  if (entry.daysAgo <= 0) return 'Today';
  if (entry.daysAgo <= 6) return WEEKDAYS[day.getDay()];
  return `${MONTHS[day.getMonth()]} ${day.getDate()}`;
}

/** After the strong "It’s been a while": " with Sam and Joel. Log a catch-up when you talk." */
export function driftingLine(people: readonly Pick<DriftingView, 'firstName'>[]): string {
  return ` with ${joined(people.map((p) => p.firstName))}. Log a catch-up when you talk.`;
}

/** "Sam · 59 days". */
export function driftingChip(person: Pick<DriftingView, 'firstName' | 'daysSince'>): string {
  return `${person.firstName} · ${person.daysSince} days`;
}

/** "Today · You promised", "2 days late · You promised". */
export function todayDue(dueText: string, isPromise: boolean): string {
  return isPromise ? `${dueText} · You promised` : dueText;
}

/** "Every 2 weeks · the last one was Aug 30". */
export function overdueLine(rhythmLabel: string, lastTime: string): string {
  const day = parseDay(lastTime);
  return `${rhythmLabel} · the last one was ${MONTHS[day.getMonth()]} ${day.getDate()}`;
}

/** "23 people from your Popkins are ready to import. Only you can see your contacts." */
export function readyToImportLine(total: number): string {
  const who = total === 1 ? '1 person' : `${total} people`;
  return `${who} from your Popkins ${total === 1 ? 'is' : 'are'} ready to import. Only you can see your contacts.`;
}
