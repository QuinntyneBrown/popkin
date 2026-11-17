import {
  ContactKeyDateView,
  KeyDateDraft,
  DatesFilter,
  KeyDateKind,
  KeyDateRowView,
  ReminderLead,
} from '../../models/contacts';
import { possessive } from './contacts-text';
import { LONG_MONTHS as MONTHS } from '../text/calendar';
import { daysAway } from '../text/relative-day';

/** The six lead times, in the order every "Remind me" offers them (L2-138 AC1). */
export const REMINDER_LEADS: readonly { value: ReminderLead; label: string }[] = [
  { value: 'OnTheDay', label: 'On the day' },
  { value: 'OneDayBefore', label: '1 day before' },
  { value: 'ThreeDaysBefore', label: '3 days before' },
  { value: 'OneWeekBefore', label: '1 week before' },
  { value: 'TwoWeeksBefore', label: '2 weeks before' },
  { value: 'OneMonthBefore', label: '1 month before' },
];

/** Dates' filter chips (L2-137 AC2); Milestones shows milestones and something else (gap 103). */
export const DATES_FILTERS: readonly { value: DatesFilter; label: string }[] = [
  { value: 'all', label: 'Everything' },
  { value: 'birthdays', label: 'Birthdays' },
  { value: 'anniversaries', label: 'Anniversaries' },
  { value: 'milestones', label: 'Milestones' },
];

/** The kinds Add a date offers (L2-138 AC1). */
export const ADD_DATE_KINDS: readonly { value: KeyDateKind; label: string }[] = [
  { value: 'Birthday', label: 'Birthday' },
  { value: 'Anniversary', label: 'Anniversary' },
  { value: 'Other', label: 'Something else' },
];

/** A date 14 days away or fewer is tinted on Dates (known gap 113, ruled). */
export const SOON_DAYS = 14;

/** A profile shows the days left at 30 or fewer (known gap 101, ruled). */
export const PROFILE_NEAR_DAYS = 30;

export function leadLabel(lead: ReminderLead): string {
  return REMINDER_LEADS.find((l) => l.value === lead)?.label ?? '';
}

/** "today", "tomorrow" or "in {n} days". */
export function dateWhen(days: number): string {
  return daysAway(days);
}

/** "Grace’s birthday", "Grace’s anniversary", or the date's own title. */
export function dateTitle(date: Pick<KeyDateRowView, 'kind' | 'title' | 'firstName'>): string {
  if (date.kind === 'Birthday') return `${possessive(date.firstName)} birthday`;
  if (date.kind === 'Anniversary') return `${possessive(date.firstName)} anniversary`;
  return date.title ?? 'Milestone';
}

/** A profile's name for a date: "Birthday", "Anniversary" or its title. */
export function profileDateTitle(date: Pick<ContactKeyDateView, 'kind' | 'title'>): string {
  if (date.kind === 'Birthday') return 'Birthday';
  if (date.kind === 'Anniversary') return 'Anniversary';
  return date.title ?? 'Milestone';
}

/** "Turns 33", "5 years married", "2 years"; none without a first year. */
export function dateLine(date: Pick<KeyDateRowView, 'kind' | 'years'>): string | undefined {
  const years = date.years;
  if (years === null) return undefined;
  if (date.kind === 'Birthday') return `Turns ${years}`;
  const span = `${years} ${years === 1 ? 'year' : 'years'}`;
  return date.kind === 'Anniversary' ? `${span} married` : span;
}

export function kindIcon(kind: KeyDateKind): 'cake' | 'heart' | 'milestone' {
  if (kind === 'Birthday') return 'cake';
  if (kind === 'Anniversary') return 'heart';
  return 'milestone';
}

/** A yyyy-MM-dd day as a local date. */
export function parseDay(day: string): Date {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(year, month - 1, date);
}

/** The weekday and day of the month of a date tile: "Sat", "19". */
export function dateTile(day: string): { top: string; day: string } {
  const date = parseDay(day);
  return {
    top: date.toLocaleDateString('en-US', { weekday: 'short' }),
    day: String(date.getDate()),
  };
}

export interface MonthGroup<T> {
  id: string;
  heading: string;
  dates: T[];
}

/** Dates by month, in order; a month of a later year is named with its year. */
export function monthGroups<T extends { occursOn: string }>(
  dates: readonly T[],
  today: Date,
): MonthGroup<T>[] {
  const groups: MonthGroup<T>[] = [];
  for (const date of dates) {
    const [year, month] = date.occursOn.split('-').map(Number);
    const id = `m-${year}-${String(month).padStart(2, '0')}`;
    let group = groups.find((g) => g.id === id);
    if (!group) {
      const name = MONTHS[month - 1];
      group = { id, heading: year === today.getFullYear() ? name : `${name} ${year}`, dates: [] };
      groups.push(group);
    }
    group.dates.push(date);
  }
  return groups;
}

/** "Sat, Sep 26 · in 11 days" when 30 days away or fewer; otherwise "Jan 24". */
export function profileDateLine(
  date: Pick<ContactKeyDateView, 'nextOn' | 'month' | 'day'>,
  today: Date,
): string {
  const short = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  if (!date.nextOn) return short(new Date(2001, date.month - 1, date.day));
  const next = parseDay(date.nextOn);
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const days = Math.round((next.getTime() - start.getTime()) / 86_400_000);
  if (days < 0 || days > PROFILE_NEAR_DAYS) return short(next);
  const weekday = next.toLocaleDateString('en-US', { weekday: 'short' });
  return `${weekday}, ${short(next)} · ${dateWhen(days)}`;
}

/**
 * "The day" as Add a date sends it. An every-year date keeps a year before this one only, its
 * first year; a later one is its next day, not its first (known gap 113, ruled).
 */
export function dayFromInput(
  value: string,
  everyYear: boolean,
  today: Date,
): { month: number; day: number; year: number | null } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  return {
    month,
    day,
    year: everyYear && year >= today.getFullYear() ? null : year,
  };
}

/** A date to remember's name in the contact form: "Birthday", "Anniversary" or its title. */
export function draftKind(draft: Pick<KeyDateDraft, 'kind' | 'title'>): string {
  if (draft.kind === 'Birthday' || draft.kind === 'Anniversary') return draft.kind;
  return draft.title ?? 'Something else';
}

/** "9 March"; a one-off date with its year, "26 December 2026". */
export function draftDay(
  draft: Pick<KeyDateDraft, 'month' | 'day' | 'year' | 'everyYear'>,
): string {
  const day = `${draft.day} ${MONTHS[draft.month - 1]}`;
  return draft.everyYear || draft.year === null ? day : `${day} ${draft.year}`;
}
