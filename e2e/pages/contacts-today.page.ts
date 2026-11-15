import type { Locator, Page } from '@playwright/test';
import { ContactsNav } from './contacts-nav';

/** Today, `/contacts` (L2-125): the first Contacts page. */
export class ContactsTodayPage {
  readonly root: Locator;
  readonly nav: ContactsNav;
  readonly heading: Locator;
  readonly dateLine: Locator;
  /** Nobody in Contacts yet (L2-125 AC8). */
  readonly start: Locator;
  readonly startHeading: Locator;
  readonly startLead: Locator;
  readonly addSomeone: Locator;
  /** Regions for the sweeps and the parity specs. */
  readonly pageHead: Locator;

  constructor(page: Page) {
    this.root = page.locator('body[data-page="contacts-today"]');
    this.nav = new ContactsNav(page);
    this.heading = page.getByRole('heading', { level: 1 });
    this.pageHead = page.locator('.page-head');
    this.dateLine = this.pageHead.locator('.page-head__sub');
    this.start = page.getByRole('region', { name: 'Who do you want to keep close?' });
    this.startHeading = this.start.getByRole('heading', { level: 2 });
    this.startLead = this.start.locator('p').first();
    this.addSomeone = this.start.getByRole('link', { name: 'Add someone' });
  }
}
