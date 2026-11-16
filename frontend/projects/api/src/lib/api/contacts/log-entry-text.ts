import { MilestoneKind, ReminderLead, TalkChannel, TimelineItemView } from '../../models/contacts';
import { leadLabel, parseDay } from './contact-dates-text';
import { possessive } from './contacts-text';

/** "In person", "Phone", "Video" and "Messages" (L2-133 AC1). */
export const TALK_CHANNELS: readonly { value: TalkChannel; label: string }[] = [
  { value: 'InPerson', label: 'In person' },
  { value: 'Phone', label: 'Phone' },
  { value: 'Video', label: 'Video' },
  { value: 'Messages', label: 'Messages' },
];

/** "New job" to "Something else" (L2-134 AC1). */
export const MILESTONE_KINDS: readonly { value: MilestoneKind; label: string }[] = [
  { value: 'NewJob', label: 'New job' },
  { value: 'Wedding', label: 'Wedding' },
  { value: 'NewBaby', label: 'New baby' },
  { value: 'Moved', label: 'Moved' },
  { value: 'Graduated', label: 'Graduated' },
  { value: 'SomethingElse', label: 'Something else' },
];

export function channelLabel(channel: TalkChannel): string {
  return TALK_CHANNELS.find((c) => c.value === channel)?.label ?? '';
}

export function milestoneLabel(kind: MilestoneKind): string {
  return MILESTONE_KINDS.find((k) => k.value === kind)?.label ?? '';
}

/** "Sep 6" this year, "Sep 26, 2021" before it (L2-135 AC1). */
export function timelineDay(day: string, today: Date): string {
  const date = parseDay(day);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(date.getFullYear() === today.getFullYear() ? {} : { year: 'numeric' }),
  });
}

/** "Today, 8:40 am": the moment Log opened, which a conversation is logged at. */
export function loggedAtLabel(at: Date): string {
  const hours = at.getHours();
  const minutes = String(at.getMinutes()).padStart(2, '0');
  return `Today, ${hours % 12 || 12}:${minutes} ${hours < 12 ? 'am' : 'pm'}`;
}

/** The moment as the API reads it, with the device's offset: "2026-09-15T08:40:00-07:00". */
export function loggedAtParam(at: Date): string {
  const pad = (n: number) => String(Math.abs(n)).padStart(2, '0');
  const offset = -at.getTimezoneOffset();
  const sign = offset >= 0 ? '+' : '-';
  return (
    `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}` +
    `T${pad(at.getHours())}:${pad(at.getMinutes())}:${pad(at.getSeconds())}` +
    `${sign}${pad(Math.trunc(offset / 60))}:${pad(offset % 60)}`
  );
}

/** "Remind me Thu, Sep 17" under a promise (L2-133 AC2). */
export function promiseWhen(dueOn: string): string {
  const day = parseDay(dueOn);
  const weekday = day.toLocaleDateString('en-US', { weekday: 'short' });
  const date = day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `Remind me ${weekday}, ${date}`;
}

/** The yearly key date's title (known gap 106, ruled); Something else keeps the words given. */
export function yearlyTitle(kind: MilestoneKind, firstName: string, title: string): string {
  const of = possessive(firstName);
  switch (kind) {
    case 'NewJob':
      return `${of} work anniversary`;
    case 'Wedding':
      return `${of} wedding anniversary`;
    case 'NewBaby':
      return `${of} baby’s birthday`;
    case 'Moved':
      return `${of} move anniversary`;
    case 'Graduated':
      return `${of} graduation anniversary`;
    default:
      return title.trim();
  }
}

/** "Adds “Chidi’s work anniversary” to your dates, with a nudge on the day." (L2-134 AC2). */
export function yearlyHint(title: string, lead: ReminderLead): string {
  const nudge = lead === 'OnTheDay' ? 'on the day' : leadLabel(lead);
  return `Adds “${title}” to your dates, with a nudge ${nudge}.`;
}

/** "Talked with Chidi" or "Chidi’s milestone" (L2-133 AC1, L2-134 AC1). */
export function logHeading(kind: 'conversation' | 'milestone', firstName: string): string {
  return kind === 'conversation'
    ? `Talked with ${firstName}`
    : `${possessive(firstName)} milestone`;
}

/** A timeline row's line under its day: a conversation's channel, a milestone's kind. */
export function timelineVia(entry: TimelineItemView): string | undefined {
  return entry.channel ? channelLabel(entry.channel) : undefined;
}

export function timelineTag(entry: TimelineItemView): string | undefined {
  return entry.milestoneKind ? milestoneLabel(entry.milestoneKind) : undefined;
}

/** The day after `today`, the first day a promise is reminded on. */
export function tomorrowOf(today: Date): string {
  const next = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}`;
}
