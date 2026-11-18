import type { Locator, Page } from '@playwright/test';
import { AdminShell } from './admin-shell';

/**
 * Holiday calendars (L2-196, L2-197): the banner, the list of calendars and the chosen one with
 * its years, its figures and the year's holidays.
 */
export class AdminHolidaysPage {
  readonly root: Locator;
  readonly shell: AdminShell;
  readonly heading: Locator;
  readonly sub: Locator;
  readonly banner: Locator;
  readonly list: Locator;
  readonly calendars: Locator;
  /** The chosen calendar's panel. */
  readonly calendar: Locator;
  readonly calendarName: Locator;
  readonly howSet: Locator;
  readonly years: Locator;
  readonly figures: Locator;
  readonly table: Locator;
  readonly holidays: Locator;
  readonly noDates: Locator;
  readonly loading: Locator;
  readonly empty: Locator;
  readonly tryAgain: Locator;
  readonly toast: Locator;

  constructor(private readonly page: Page) {
    this.root = page.locator('body[data-page="holidays"]');
    this.shell = new AdminShell(page);
    this.heading = page.getByRole('heading', { level: 1 });
    this.sub = page.locator('.page-head__sub');
    this.banner = page.locator('.banner');
    this.list = page.getByRole('list', { name: 'Holiday calendars' });
    this.calendars = this.list.locator('.report-item');
    this.calendar = page.locator('.panel').filter({ has: page.locator('.kv') });
    this.calendarName = this.calendar.locator('.panel__title');
    this.howSet = this.calendar.locator('.panel__sub');
    this.years = this.calendar.getByRole('tablist', { name: 'Year' });
    this.figures = this.calendar.locator('.kv');
    this.table = this.calendar.locator('table.data-table');
    this.holidays = this.table.locator('tbody tr');
    this.noDates = this.calendar.locator('.empty');
    this.loading = page.getByRole('status').filter({ hasText: 'Loading the holiday calendars…' });
    this.empty = page.locator('.empty');
    this.tryAgain = page.getByRole('button', { name: 'Try again' });
    this.toast = page.locator('.toast');
  }

  /** The row of the list for a calendar. */
  row(name: string): Locator {
    return this.calendars.filter({
      has: this.page.locator('.report-item__reason', { hasText: name }),
    });
  }

  /** A year's tab. */
  year(year: number): Locator {
    return this.years.getByRole('tab', { name: String(year) });
  }

  /** A figure's value, by its term: "People using it". */
  figure(term: string): Locator {
    return this.figures.locator('div').filter({ hasText: term }).locator('dd');
  }

  /** A holiday's row, by its name. */
  holiday(name: string): Locator {
    return this.holidays.filter({ has: this.page.locator('.kind-name', { hasText: name }) });
  }
}
