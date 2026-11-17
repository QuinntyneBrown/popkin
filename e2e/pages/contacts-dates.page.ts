import type { Locator, Page } from '@playwright/test';
import { ContactsNav } from './contacts-nav';

/** Dates, `/contacts/dates` (L2-137, L2-139). */
export class ContactsDatesPage {
  readonly root: Locator;
  /** The date tile of the first row. */
  readonly firstTile: Locator;
  readonly nav: ContactsNav;
  readonly heading: Locator;
  readonly sub: Locator;
  readonly addDate: Locator;
  readonly filters: Locator;
  readonly months: Locator;
  readonly rows: Locator;
  readonly reminders: Locator;
  readonly loading: Locator;
  /** The empty and failed states. */
  readonly state: Locator;
  readonly stateHeading: Locator;
  readonly stateText: Locator;
  readonly tryAgain: Locator;
  /** Regions for the sweeps and the parity specs. */
  readonly pageHead: Locator;
  readonly firstRow: Locator;
  readonly list: Locator;
  readonly remindersCard: Locator;

  constructor(private readonly page: Page) {
    this.root = page.locator('body[data-page="contacts-dates"]');
    this.firstTile = page.locator('ul.divided a.row').first().locator('.date-tile');
    this.nav = new ContactsNav(page);
    this.heading = page.getByRole('heading', { level: 1 });
    this.pageHead = page.locator('.page-head');
    this.sub = this.pageHead.locator('.page-head__sub');
    this.addDate = this.pageHead.getByRole('button', { name: 'Add a date' });
    this.filters = page.getByRole('group', { name: 'Show' });
    this.months = page.locator('main section').filter({ has: page.locator('ul.divided') });
    this.list = page.locator('ul.divided');
    this.rows = this.list.locator('a.row');
    this.firstRow = this.rows.first();
    // The mock draws it as an info card; the app as its own block.
    this.remindersCard = page.locator('aside.info-card, aside.reminder-defaults');
    this.reminders = page.getByRole('complementary', { name: 'Reminders' });
    this.loading = page.getByRole('status').filter({ hasText: 'Loading your dates…' });
    this.state = page.locator('.empty');
    this.stateHeading = this.state.getByRole('heading');
    this.stateText = this.state.locator('p');
    this.tryAgain = page.getByRole('button', { name: 'Try again' });
  }

  filter(name: string): Locator {
    return this.filters.getByRole('button', { name, exact: true });
  }

  month(name: string): Locator {
    return this.page.getByRole('region', { name, exact: true });
  }

  row(title: string): Locator {
    return this.rows.filter({ hasText: title });
  }

  /** "Birthdays: remind me". */
  defaultFor(kinds: string): Locator {
    return this.page.getByRole('combobox', { name: `${kinds}: remind me` });
  }

  stateAction(name: string): Locator {
    return this.state.getByRole('button', { name });
  }
}
