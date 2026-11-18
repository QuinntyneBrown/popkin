import type { Page } from '@playwright/test';
import { recordedBody } from './stubs';

interface RecordedHolidayCalendars {
  thisYear: number;
  calendars: { id: string; name: string }[];
}

/** The recorded Holiday calendars: the seed's five, in the seed's order (gap 145). */
export const HOLIDAYS = recordedBody<RecordedHolidayCalendars>('GET /api/admin/holiday-calendars');

/** The recorded id of a calendar, by its name. */
export function holidayCalendarId(name: string): string {
  return HOLIDAYS.calendars.find((c) => c.name === name)!.id;
}

const mockRow = (
  id: string,
  name: string,
  holds: string,
  people: number,
  datesThrough: number | null,
) => ({
  id,
  name,
  holds,
  people,
  datesThrough,
  draft: datesThrough === null,
  needsDates: datesThrough !== null && datesThrough <= 2025,
});

/** The calendars the mocks draw, on 1 December 2025 (docs/mocks/admin/pages/holidays). */
export const MOCK_HOLIDAY_CALENDARS = {
  thisYear: 2025,
  calendars: [
    mockRow('us', 'United States', 'Federal and widely observed', 412880, 2027),
    mockRow('uk', 'United Kingdom', 'Bank holidays, England & Wales', 188420, 2027),
    mockRow('islamic', 'Islamic holidays', 'Ramadan, Eid al-Fitr, Eid al-Adha', 63950, 2025),
    mockRow('jewish', 'Jewish holidays', 'Major festivals, from the Hebrew calendar', 51200, 2027),
    mockRow('hindu', 'Hindu festivals', 'Holi, Navratri, Diwali', 44820, 2025),
    mockRow('lunar', 'Lunar New Year & festivals', 'Lunar New Year, Mid-Autumn', 39110, 2026),
    mockRow('canada', 'Canada', 'Federal statutory holidays', 74310, 2026),
    mockRow('australia', 'Australia', 'National public holidays', 0, null),
  ],
  withoutNextYear: { names: ['Islamic holidays', 'Hindu festivals'], people: 108770 },
};

const estimated = (id: string, name: string, date: string, note: string | null = null) => ({
  id,
  name,
  note,
  date,
  status: 'Estimated',
});

/** Islamic holidays in 2026, as `default.html` draws them. */
export const MOCK_ISLAMIC_2026 = {
  id: 'islamic',
  name: 'Islamic holidays',
  howSet: 'Moon sighting, confirmed by hand',
  years: [2025, 2026, 2027],
  year: 2026,
  people: 63950,
  popkins: 1340,
  lastEdited: { at: '2025-01-14T12:00:00Z', adminName: 'Kwame' },
  publishedAt: null,
  holidays: [
    estimated('h1', 'Ramadan begins', '2026-02-18', 'Could be 19 Feb'),
    estimated('h2', 'Eid al-Fitr', '2026-03-20', 'Could be 21 Mar'),
    estimated('h3', 'Eid al-Adha', '2026-05-27'),
    estimated('h4', 'Islamic New Year', '2026-06-16'),
    estimated('h5', 'Mawlid', '2026-08-25'),
  ],
  estimates: 5,
};

/** Holiday calendars answers the mocks' calendars and Islamic holidays in 2026. */
export async function theMockHolidayCalendars(page: Page): Promise<void> {
  await page.route('**/api/admin/holiday-calendars', (route) =>
    route.fulfill({ json: MOCK_HOLIDAY_CALENDARS }),
  );
  await page.route('**/api/admin/holiday-calendars/islamic*', (route) =>
    route.fulfill({ json: MOCK_ISLAMIC_2026 }),
  );
}
