import type { Locator, Page } from '@playwright/test';
import { ContactsNav } from './contacts-nav';

/** Habits, `/contacts/habits` (L2-143, L2-144). */
export class ContactsHabitsPage {
  readonly root: Locator;
  readonly nav: ContactsNav;
  readonly heading: Locator;
  readonly sub: Locator;
  readonly newHabit: Locator;
  /** The overdue habit that leads. */
  readonly lead: Locator;
  readonly leadWhen: Locator;
  readonly leadTitle: Locator;
  readonly leadSub: Locator;
  readonly leadStrip: Locator;
  readonly call: Locator;
  readonly metUp: Locator;
  readonly list: Locator;
  readonly rows: Locator;
  readonly rowTitles: Locator;
  readonly rowStrips: Locator;
  readonly rowStreaks: Locator;
  readonly rowNext: Locator;
  readonly loading: Locator;
  /** The empty and failed states. */
  readonly state: Locator;
  readonly stateHeading: Locator;
  readonly stateText: Locator;
  readonly stateAction: Locator;
  readonly tryAgain: Locator;
  /** Regions for the sweeps and the parity specs. */
  readonly pageHead: Locator;
  readonly firstRow: Locator;

  constructor(page: Page) {
    this.root = page.locator('body[data-page="contacts-habits"]');
    this.nav = new ContactsNav(page);
    this.heading = page.getByRole('heading', { level: 1 });
    this.pageHead = page.locator('.page-head');
    this.sub = this.pageHead.locator('.page-head__sub');
    this.newHabit = this.pageHead
      .getByRole('link', { name: 'New habit' })
      .or(this.pageHead.getByRole('button', { name: 'New habit' }));
    this.lead = page.locator('section.spotlight');
    this.leadWhen = this.lead.locator('.spotlight__when');
    this.leadTitle = this.lead.locator('.spotlight__title');
    this.leadSub = this.lead.locator('.spotlight__sub');
    this.leadStrip = this.lead.locator('.keep-strip');
    this.call = this.lead.getByRole('link', { name: /^Call / });
    this.metUp = this.lead
      .getByRole('button', { name: 'We met up' })
      .or(this.lead.getByRole('link', { name: 'We met up' }));
    this.list = page.locator('ul.divided');
    this.rows = this.list.locator('li.habit-row');
    this.firstRow = this.rows.first();
    this.rowTitles = this.rows.locator('.habit-row__title');
    this.rowStrips = this.rows.locator('.keep-strip');
    this.rowStreaks = this.rows.locator('.habit-row__streak');
    this.rowNext = this.rows.locator('.habit-row__end > :last-child');
    this.loading = page.getByRole('status').filter({ hasText: 'Loading your habits…' });
    this.state = page.locator('.empty');
    this.stateHeading = this.state.getByRole('heading');
    this.stateText = this.state.locator('p');
    this.stateAction = this.state.getByRole('button');
    this.tryAgain = page.getByRole('button', { name: 'Try again' });
  }
}
