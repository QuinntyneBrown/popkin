// Acceptance Test
// Traces to: L2-196 AC1-AC4, L2-089 AC7
// Description: any admin opens Holiday calendars from the sidebar, reads which calendars lack next
// year's dates, and chooses a calendar and a year to read its holidays.
import { atTheRecording } from '../../fixtures/admin';
import { HOLIDAYS, holidayCalendarId } from '../../fixtures/holidays';
import { expect, test } from '../../fixtures/pk-test';
import { hold } from '../../fixtures/stubs';
import { AdminHolidaysPage } from '../../pages/admin/holidays.page';

test.describe('Holiday calendars (L2-196)', () => {
  test.beforeEach(({ page }) => atTheRecording(page));

  // Given two published calendars without next year's dates, when the sidebar shows, then
  // "Holiday calendars" sits between "Notifications" and "Limits" with a count of 2 (AC1).
  test('the sidebar counts the calendars without next year’s dates', async ({ page, pk }) => {
    const view = new AdminHolidaysPage(page);
    await pk.open('adminAudit');

    const items = view.shell.nav.locator('.admin-nav__item');
    await expect(items.filter({ hasText: /Notifications|Holiday calendars|Limits/ })).toHaveText([
      /Notifications/,
      /Holiday calendars/,
      /Limits/,
    ]);
    const item = view.shell.nav.getByRole('link', { name: /Holiday calendars/ });
    await expect(item.locator('.badge [aria-hidden="true"]')).toHaveText('2');
    await expect(item.locator('.badge .visually-hidden')).toHaveText('2 without next year’s dates');
    await item.click();
    await expect(view.root).toBeVisible();
    await expect(view.shell.current).toContainText('Holiday calendars');
  });

  // Given the seeded calendars, when Holiday calendars opens, then it lists each with what it
  // holds, its people and "Dates through", warns the ones through this year, reads "Draft" for a
  // draft, and names the warned ones in the banner (AC2, AC3).
  test('lists the calendars and warns the ones without next year', async ({ page, pk }) => {
    const view = new AdminHolidaysPage(page);
    await pk.open('adminHolidays');

    await expect(page).toHaveTitle('Holiday calendars · Popkin Admin');
    await expect(view.heading).toHaveText('Holiday calendars');
    await expect(view.sub).toHaveText(
      'Calendars people turn on for their own Important days or for a Popkin. Changes reach everyone within an hour.',
    );
    await expect(view.banner).toContainText(
      `Islamic holidays and Hindu festivals have no dates after 31 Dec ${HOLIDAYS.thisYear}.`,
    );
    await expect(view.banner).toContainText(
      'From January, 0 people and their Popkins won’t see these holidays.',
    );
    await expect(view.calendars.locator('.report-item__reason')).toHaveText([
      'United States',
      'United Kingdom',
      'Islamic holidays',
      'Hindu festivals',
      'Australia',
    ]);
    await expect(view.row('United States').locator('.report-item__where')).toHaveText(
      'Federal and widely observed',
    );
    await expect(view.row('United States').locator('.report-item__meta')).toHaveText(
      `Nobody yet Dates through ${HOLIDAYS.thisYear + 2}`,
    );
    await expect(view.row('Islamic holidays').locator('.status--warn')).toHaveText(
      `Dates through ${HOLIDAYS.thisYear}`,
    );
    await expect(view.row('Australia').locator('.status')).toHaveText('Draft');
  });

  // Given the page opens with no calendar chosen, when it shows, then the first warned calendar
  // is chosen at next year, with its figures and its holidays in date order (AC4).
  test('opens on the first warned calendar at next year', async ({ page, pk }) => {
    const view = new AdminHolidaysPage(page);
    await pk.open('adminHolidays');

    await expect(view.row('Islamic holidays')).toHaveAttribute('aria-current', 'true');
    await expect(view.calendarName).toHaveText('Islamic holidays');
    await expect(view.howSet).toHaveText('Moon sighting, confirmed by hand');
    await expect(view.years.getByRole('tab')).toHaveText([
      String(HOLIDAYS.thisYear),
      String(HOLIDAYS.thisYear + 1),
      String(HOLIDAYS.thisYear + 2),
    ]);
    await expect(view.year(HOLIDAYS.thisYear + 1)).toHaveAttribute('aria-selected', 'true');
    await expect(view.figure('People using it')).toHaveText('0');
    await expect(view.figure('Popkins using it')).toHaveText('0');
    await expect(view.figure('Last edited')).toHaveText('Not yet');
    await expect(view.holidays.locator('.kind-name')).toHaveText([
      'Ramadan begins',
      'Eid al-Fitr',
      'Eid al-Adha',
      'Islamic New Year',
      'Mawlid',
    ]);
    const ramadan = view.holiday('Ramadan begins');
    await expect(ramadan.locator('.kind-about')).toHaveText('Could be 9 Feb');
    await expect(ramadan.locator('td').nth(1)).toHaveText('Mon 8 Feb');
    await expect(ramadan.locator('.status--warn')).toHaveText('Estimated');
  });

  // Given a calendar set by rule, when it is chosen, then every holiday reads "By rule" with its
  // note (AC4); choosing a year reads that year, and a year with none says so.
  test('choosing a calendar and a year reads its holidays', async ({ page, pk }) => {
    const view = new AdminHolidaysPage(page);
    await pk.open('adminHolidays');

    await view.row('United States').click();

    await expect(page).toHaveURL(new RegExp(`/holidays/${holidayCalendarId('United States')}$`));
    await expect(view.calendarName).toHaveText('United States');
    await expect(view.year(HOLIDAYS.thisYear)).toHaveAttribute('aria-selected', 'true');
    await expect(view.holiday('Independence Day').locator('.kind-about')).toHaveText(
      'Observed Fri 3 Jul',
    );
    await expect(view.holidays.locator('.status')).toHaveText(Array(6).fill('By rule'));

    await view.row('Australia').click();
    await view.year(HOLIDAYS.thisYear + 2).click();

    await expect(page).toHaveURL(new RegExp(`year=${HOLIDAYS.thisYear + 2}$`));
    await expect(view.noDates).toHaveText(`No ${HOLIDAYS.thisYear + 2} dates yet.`);
    await expect(view.table).toHaveCount(0);
  });

  // Given the calendars are being read, when the page shows, then it says so over skeletons.
  test('says it is loading the calendars', async ({ page, pk }) => {
    await hold(page, 'GET /api/admin/holiday-calendars');
    const view = new AdminHolidaysPage(page);
    await pk.open('adminHolidaysLoading');

    await expect(view.loading).toBeAttached();
  });

  // Given the admin API does not answer, when the page opens, then it says so and "Try again"
  // reads the calendars again (L2-089 AC7).
  test('says when the calendars could not be loaded and tries again', async ({ page, pk }) => {
    let failing = true;
    await page.route('**/api/admin/holiday-calendars', (route) =>
      failing ? route.fulfill({ status: 503 }) : route.fallback(),
    );
    const view = new AdminHolidaysPage(page);
    await pk.open('adminHolidaysError');

    await expect(view.empty).toContainText('Couldn’t load the holiday calendars');
    await expect(view.empty).toContainText(
      'The admin API didn’t answer. Nothing has changed; try again, or check Health if it keeps happening.',
    );
    failing = false;
    await view.tryAgain.click();

    await expect(view.calendarName).toHaveText('Islamic holidays');
  });
});
