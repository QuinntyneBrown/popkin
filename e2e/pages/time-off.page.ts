import type { Locator, Page } from '@playwright/test';

/** Time off, the first view of the Schedule tab, `/p/:popkinId/schedule` (L2-072). */
export class TimeOffPage {
  readonly root: Locator;
  readonly header: Locator;
  readonly heading: Locator;
  readonly views: Locator;
  readonly currentView: Locator;
  readonly thisWeekView: Locator;
  readonly addMyTimeOff: Locator;
  readonly month: Locator;
  readonly year: Locator;
  readonly previousMonth: Locator;
  readonly nextMonth: Locator;
  readonly weeks: Locator;
  /** The chips of the month's weeks. */
  readonly weekChips: Locator;
  readonly pressedWeek: Locator;
  /** The dot on the chip of the week that holds the event (L2-072 AC3). */
  readonly eventDot: Locator;
  readonly previousWeek: Locator;
  readonly nextWeek: Locator;
  /** "Go to {event}" (L2-072 AC7). */
  readonly goToEvent: Locator;
  readonly monthNav: Locator;
  readonly table: Locator;
  readonly tableWrap: Locator;
  readonly caption: Locator;
  /** The day headings, Monday to Sunday. */
  readonly days: Locator;
  /** The "{n} of {members} off" of each day. */
  readonly counts: Locator;
  /** The count of a day where every member but at most one is off, in bold (L2-072 AC6). */
  readonly boldCounts: Locator;
  readonly rows: Locator;
  readonly names: Locator;
  readonly legend: Locator;
  readonly nobodyYet: Locator;
  readonly loading: Locator;
  readonly error: Locator;
  readonly tryAgain: Locator;
  readonly nav: Locator;
  readonly currentTab: Locator;
  /** Regions for the sweeps and the parity specs. */
  readonly body: Locator;

  constructor(readonly page: Page) {
    this.root = page.locator('body[data-page="time-off"]');
    this.header = page.locator('header.plan-header');
    this.heading = page.getByRole('heading', { level: 1, name: 'Schedule' });
    this.views = page.getByRole('navigation', { name: 'Views' });
    this.currentView = this.views.locator('[aria-current="page"]');
    this.thisWeekView = this.views.getByRole('link', { name: 'This week' });
    this.addMyTimeOff = this.header.getByRole('button', { name: 'Add my time off' });
    this.monthNav = page.locator('.month-nav');
    this.month = this.monthNav.locator('.month-nav__name');
    this.year = this.monthNav.locator('.month-nav__year');
    this.previousMonth = this.monthNav.getByRole('link', { name: 'Previous month' });
    this.nextMonth = this.monthNav.getByRole('link', { name: 'Next month' });
    this.goToEvent = this.monthNav.getByRole('link', { name: /^Go to / });
    this.weeks = page.locator('.weeks');
    this.weekChips = this.weeks
      .getByRole('list', { name: 'Weeks in this month' })
      .getByRole('link');
    this.pressedWeek = this.weekChips.and(page.locator('[aria-pressed="true"]'));
    this.eventDot = this.weeks.getByRole('img', { name: 'Event this week' });
    this.previousWeek = this.weeks.getByRole('link', { name: 'Previous week' });
    this.nextWeek = this.weeks.getByRole('link', { name: 'Next week' });
    this.table = page.locator('table.leave');
    this.tableWrap = page.locator('.table-wrap');
    this.caption = this.table.locator('caption');
    this.days = this.table.locator('thead th:not(:first-child)');
    this.counts = this.table.locator('thead .leave__off');
    this.boldCounts = this.table.locator('thead .leave__off--many');
    this.rows = this.table.locator('tbody tr');
    this.names = this.table.locator('tbody th[scope="row"] .truncate');
    this.legend = page.locator('.chart-legend');
    this.nobodyYet = page.getByText('Nobody has added time off yet.');
    this.loading = page.getByRole('status').filter({ hasText: 'Loading time off…' });
    this.error = page.getByRole('alert').filter({ hasText: 'We couldn’t load time off' });
    this.tryAgain = this.error.getByRole('button', { name: 'Try again' });
    this.nav = page.getByRole('navigation', { name: 'Popkin' });
    this.currentTab = this.nav.locator('[aria-current="page"]');
    this.body = page.locator('.schedule');
  }

  /** The cells of one member's row, Monday to Sunday, as assistive technology names them. */
  cellsOf(firstName: string): Locator {
    return this.rows
      .filter({ has: this.page.getByRole('rowheader', { name: firstName }) })
      .locator('td .leave__cell');
  }
}
