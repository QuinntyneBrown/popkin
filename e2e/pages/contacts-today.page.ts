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
  /** The day (L2-125 AC2 to AC7). */
  readonly spotlight: Locator;
  readonly spotlightHeading: Locator;
  readonly comingUp: Locator;
  readonly comingUpRows: Locator;
  readonly comingUpList: Locator;
  readonly recentList: Locator;
  readonly driftChips: Locator;
  readonly toDo: Locator;
  readonly recent: Locator;
  readonly recentRows: Locator;
  readonly drift: Locator;
  readonly status: Locator;
  readonly failed: Locator;
  readonly toast: Locator;
  readonly importPeople: Locator;

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
    this.importPeople = this.start.getByRole('button', { name: 'Import from your Popkins' });
    this.spotlight = page.locator('section.spotlight');
    this.spotlightHeading = this.spotlight.getByRole('heading', { level: 2 });
    this.comingUp = page.getByRole('region', { name: 'Coming up' });
    this.comingUpList = this.comingUp.locator('ul');
    this.comingUpRows = this.comingUpList.locator('> li');
    this.toDo = page.getByRole('region', { name: 'To do today' });
    this.recent = page.getByRole('region', { name: 'Recently' });
    this.recentList = this.recent.locator('ul');
    this.recentRows = this.recentList.locator('> li');
    this.drift = page.getByRole('region', { name: 'It’s been a while' });
    this.driftChips = this.drift.locator('.cluster, .drift-chips');
    this.status = page.getByRole('status').filter({ hasText: 'Loading your day' });
    this.failed = page.locator('.empty');
    this.toast = page.locator('.toast').last();
  }

  markDone(text: string): Locator {
    return this.toDo.getByRole('button', { name: `Mark done: ${text}` });
  }

  markNotDone(text: string): Locator {
    return this.toDo.getByRole('button', { name: `Mark not done: ${text}` });
  }

  /** One who chip of "It's been a while", a link to Log ("Sam · 59 days"). */
  driftChip(name: string): Locator {
    return this.driftChips.getByRole('link', { name, exact: true });
  }
}
