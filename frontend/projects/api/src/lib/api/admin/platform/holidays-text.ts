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
