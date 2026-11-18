import {
  AdminHolidayCalendar,
  AdminHolidayCalendarRow,
  HolidayStatus,
} from '../../../models/admin';

const count = (n: number) => new Intl.NumberFormat('en-GB').format(n);

/** "A", "A and B", "A, B and C". */
export function joinNames(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/** The banner's first line (L2-196 AC3). */
export function holidaysBannerHeading(names: readonly string[], thisYear: number): string {
  return `${joinNames(names)} have no dates after 31 Dec ${thisYear}.`;
}

/** The banner's second line (L2-196 AC3). */
export function holidaysBannerText(people: number): string {
  return `From January, ${count(people)} people and their Popkins won’t see these holidays.`;
}

/** A calendar's people in the list: "412,880 people", "Nobody yet" for none (L2-196 AC2). */
export function calendarPeople(people: number): string {
  if (people === 0) return 'Nobody yet';
  return `${count(people)} ${people === 1 ? 'person' : 'people'}`;
}

/** "Dates through 2027", or "Draft" for a calendar not yet published (L2-196 AC2). */
export function datesThrough(row: Pick<AdminHolidayCalendarRow, 'draft' | 'datesThrough'>): string {
  return row.draft || row.datesThrough === null ? 'Draft' : `Dates through ${row.datesThrough}`;
}

/** "Last edited": "14 Jan · Kwame", or "Not yet" while it is as the seed set it (L2-196 AC4). */
export function lastEditedText(
  lastEdited: AdminHolidayCalendar['lastEdited'],
  timeZone?: string,
): string {
  if (!lastEdited) return 'Not yet';
  const day = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone }).format(
    new Date(lastEdited.at),
  );
  return `${day} · ${lastEdited.adminName}`;
}

/** A holiday's date, `yyyy-MM-dd`, as "Wed 18 Feb" (L2-196 AC4). */
export function holidayDate(date: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })
    .format(new Date(`${date}T00:00:00Z`))
    .replace(',', '');
}

/** A holiday's status in words, and the tone of its pill. */
export const HOLIDAY_STATUS: Record<
  HolidayStatus,
  { text: string; tone: 'neutral' | 'warn' | 'ok' }
> = {
  ByRule: { text: 'By rule', tone: 'neutral' },
  Estimated: { text: 'Estimated', tone: 'warn' },
  Confirmed: { text: 'Confirmed', tone: 'ok' },
};

/** A year with no holidays (L2-196 AC4). */
export function noDatesText(year: number): string {
  return `No ${year} dates yet.`;
}

/** The name of the sidebar's count beside "Holiday calendars" (L2-196 AC1). */
export function withoutNextYearLabel(n: number): string {
  return `${n} without next year’s dates`;
}

/** "Live since 14 Jul", or "today" (L2-197 AC4). */
function liveSince(publishedAt: string, now: Date, timeZone?: string): string {
  const format = (d: Date) =>
    new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone }).format(d);
  const day = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone }).format(d);
  const at = new Date(publishedAt);
  return day(at) === day(now) ? 'today' : format(at);
}

/**
 * The line under a year's holidays (L2-197 AC2, AC4): its estimates and, before it is published,
 * "Publish {year}" beside it; null for a year with no holidays.
 */
export function holidaysYearLine(
  calendar: Pick<AdminHolidayCalendar, 'year' | 'holidays' | 'estimates' | 'publishedAt'>,
  now: Date,
  timeZone?: string,
): string | null {
  const total = calendar.holidays.length;
  if (total === 0) return null;
  const estimates = `${calendar.estimates} of ${total} dates are still estimates`;
  if (!calendar.publishedAt) {
    return calendar.estimates > 0
      ? `${estimates}. Members see them as “expected”.`
      : 'All dates confirmed.';
  }
  if (calendar.holidays.every((h) => h.status === 'ByRule')) {
    return `Every date follows a rule, so there is nothing to confirm. ${calendar.year} is live.`;
  }
  const since = `Live since ${liveSince(calendar.publishedAt, now, timeZone)}.`;
  return calendar.estimates > 0
    ? `${since} ${estimates}; members see them as “expected” until you confirm each one.`
    : since;
}

/** "Publish 2026". */
export function publishYearLabel(year: number): string {
  return `Publish ${year}`;
}

/** The publish dialog (L2-197 AC3); its reason is required, as every reasoned dialog's is. */
export function publishHolidaysDialog(
  calendar: Pick<AdminHolidayCalendar, 'name' | 'year' | 'holidays' | 'estimates' | 'popkins'>,
) {
  const dates = calendar.holidays.length;
  const estimates =
    calendar.estimates > 0
      ? ` ${calendar.estimates} are estimates and show as “expected” until you confirm them.`
      : '';
  return {
    heading: `Publish ${calendar.name} for ${calendar.year}?`,
    description: `${dates} dates appear on the Important days of everyone using this calendar, and on ${count(calendar.popkins)} Popkins.${estimates}`,
    confirm: publishYearLabel(calendar.year),
    busy: 'Publishing…',
    keep: 'Cancel',
    placeholder: 'For example: dates confirmed with the moon-sighting committee',
  };
}

/** The toast once a year is live (L2-197 AC4). */
export function holidaysPublishedToast(published: {
  calendarName: string;
  year: number;
  people: number;
  popkins: number;
}): [string, string] {
  return [
    'Published',
    `${published.calendarName} ${published.year} is live for ${count(published.people)} people and ${count(published.popkins)} Popkins.`,
  ];
}

/** A holiday's date field, and its "Change" (L2-197 AC1). */
export function holidayDateLabel(name: string): string {
  return `Date of ${name}`;
}

export function changeHolidayLabel(name: string): string {
  return `Change the date of ${name}`;
}
