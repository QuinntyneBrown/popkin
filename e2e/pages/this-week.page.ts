import type { Locator, Page } from '@playwright/test';

/** This week (L2-074): seven days from today, the chosen evening's headline and its timeline. */
export class ThisWeekPage {
  readonly root: Locator;
  readonly header: Locator;
  readonly heading: Locator;
  /** "Sep 12 – 18 · everyone’s working hours". */
  readonly subtitle: Locator;
  /** "My hours" in the header. */
  readonly myHours: Locator;
  readonly views: Locator;
  readonly currentView: Locator;
  readonly timeOffView: Locator;
  readonly dayPicker: Locator;
  /** The seven day buttons. */
  readonly days: Locator;
  readonly pressedDay: Locator;
  /** "Free means not working between 8 and 11 pm." */
  readonly note: Locator;
  readonly free: Locator;
  readonly headline: Locator;
  /** The time in the headline, in the Popkin's colour. */
  readonly headlineTime: Locator;
  readonly sentence: Locator;
  /** "Plan dinner in chat" or "Ask in chat anyway". */
  readonly chatAction: Locator;
  /** "My hours" in the empty headline (L2-074 AC9). */
  readonly freeMyHours: Locator;
  readonly shifts: Locator;
  readonly ticks: Locator;
  readonly rows: Locator;
  readonly names: Locator;
  readonly blocks: Locator;
  readonly tint: Locator;
  /** The timeline as assistive technology reads it. */
  readonly shiftsText: Locator;
  readonly legend: Locator;
  readonly loading: Locator;
  readonly error: Locator;
  readonly tryAgain: Locator;
  /** "Schedules is switched off" (L2-077 AC2), and its way back to the Popkin's home. */
  readonly off: Locator;
  readonly offText: Locator;
  readonly backToPopkin: Locator;
  readonly nav: Locator;
  readonly currentTab: Locator;
  readonly body: Locator;
  /** The skeleton the body draws while the view loads (`pk-schedule`). */
  readonly skeleton: Locator;

  constructor(private readonly page: Page) {
    this.root = page.locator('body[data-page="this-week"]');
    this.header = page.locator('header.plan-header');
    this.heading = this.header.getByRole('heading', { level: 1 });
    this.subtitle = this.header.locator('.plan-header__sub');
    this.myHours = this.header.getByRole('button', { name: 'My hours' });
    this.views = page.getByRole('navigation', { name: 'Views' });
    this.currentView = this.views.locator('[aria-current="page"]');
    this.timeOffView = this.views.getByRole('link', { name: 'Time off' });
    this.dayPicker = page.locator('ul.day-picker');
    this.days = page.getByRole('list', { name: 'Pick a day' }).getByRole('link');
    this.pressedDay = page
      .getByRole('list', { name: 'Pick a day' })
      .locator('[aria-pressed="true"]');
    this.note = page.getByText('Free means not working between 8 and 11 pm.');
    this.free = page.locator('section.free');
    this.headline = this.free.locator('.free__headline');
    this.headlineTime = this.headline.locator('em');
    this.sentence = this.free.locator('.free__sub');
    this.chatAction = this.free.getByRole('link');
    this.freeMyHours = this.free.getByRole('button', { name: 'My hours' });
    this.shifts = page.locator('figure.shifts');
    this.ticks = this.shifts.locator('.shifts__ticks span');
    this.rows = this.shifts.locator('.shifts__row');
    this.names = this.rows.locator('.shifts__who .truncate');
    this.blocks = this.shifts.locator('.shifts__block');
    this.tint = this.shifts.locator('.shifts__tint');
    this.shiftsText = this.shifts.locator('p.visually-hidden');
    this.legend = this.shifts.locator('.chart-legend');
    this.loading = page.getByRole('status').filter({ hasText: 'Loading the hours…' });
    this.error = page.getByRole('alert').filter({ hasText: 'We couldn’t load the hours' });
    this.tryAgain = page.getByRole('button', { name: 'Try again' });
    this.nav = page.getByRole('navigation', { name: 'Popkin' });
    this.currentTab = this.nav.locator('[aria-current="page"]');
    this.off = page.locator('.empty').filter({
      has: page.getByRole('heading', { name: 'Schedules is switched off' }),
    });
    this.offText = this.off.locator('p');
    this.backToPopkin = this.off.getByRole('link', { name: /^Back to / });
    this.body = page.locator('.schedule');
    this.skeleton = this.body.locator('[aria-hidden="true"]').first();
  }

  /** A day button by its weekday and date: "Wed 16". */
  day(name: string): Locator {
    const [weekday, date] = name.split(' ');
    return this.days
      .filter({ has: this.page.locator('.day-picker__wd').getByText(weekday, { exact: true }) })
      .filter({ has: this.page.locator('.day-picker__date').getByText(date, { exact: true }) });
  }

  /** The blocks of a member's row. */
  blocksOf(firstName: string): Locator {
    return this.rows.filter({ hasText: firstName }).locator('.shifts__block');
  }
}
