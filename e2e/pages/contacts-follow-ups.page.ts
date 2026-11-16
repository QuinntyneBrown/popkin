import type { Locator, Page } from '@playwright/test';
import { ContactsNav } from './contacts-nav';

/** Follow-ups, `/contacts/follow-ups` (L2-141, L2-142). */
export class ContactsFollowUpsPage {
  readonly root: Locator;
  readonly nav: ContactsNav;
  readonly heading: Locator;
  readonly sub: Locator;
  readonly add: Locator;
  readonly tabs: Locator;
  readonly buckets: Locator;
  readonly tasks: Locator;
  readonly showDone: Locator;
  readonly hideDone: Locator;
  readonly done: Locator;
  readonly loading: Locator;
  /** The empty and failed states. */
  readonly state: Locator;
  readonly stateHeading: Locator;
  readonly stateText: Locator;
  readonly tryAgain: Locator;
  readonly goToPeople: Locator;
  /** Regions for the sweeps and the parity specs. */
  readonly pageHead: Locator;
  readonly firstBucket: Locator;
  readonly firstTask: Locator;

  constructor(private readonly page: Page) {
    this.root = page.locator('body[data-page="contacts-follow-ups"]');
    this.nav = new ContactsNav(page);
    this.heading = page.getByRole('heading', { level: 1 });
    this.pageHead = page.locator('.page-head');
    this.sub = this.pageHead.locator('.page-head__sub');
    this.add = page.getByRole('textbox', { name: 'Add a follow-up' });
    this.tabs = page.getByRole('tablist', { name: 'Show' });
    this.buckets = page.locator('main section').filter({ has: page.locator('.list-head__count') });
    this.firstBucket = this.buckets.first();
    this.tasks = page.locator('li.task');
    this.firstTask = this.tasks.first();
    this.showDone = page.getByRole('button', { name: /^Show \d+ done$/ });
    this.hideDone = page.getByRole('button', { name: 'Hide done' });
    this.done = page.getByRole('region', { name: 'Done' });
    this.loading = page.getByRole('status').filter({ hasText: 'Loading your follow-ups…' });
    this.state = page.locator('.empty');
    this.stateHeading = this.state.getByRole('heading');
    this.stateText = this.state.locator('p');
    this.tryAgain = page.getByRole('button', { name: 'Try again' });
    this.goToPeople = page.getByRole('link', { name: 'Go to People' });
  }

  tab(name: 'Everything' | 'Promises'): Locator {
    return this.tabs.getByRole('tab', { name });
  }

  /** "Overdue", "Today", "This week" or "Later". */
  bucket(name: string): Locator {
    return this.page.getByRole('region', { name: new RegExp(`^${name}\\s*\\d+$`) });
  }

  task(text: string): Locator {
    return this.tasks.filter({ hasText: text });
  }

  markDone(text: string): Locator {
    return this.page.getByRole('button', { name: `Mark done: ${text}`, exact: true });
  }

  markNotDone(text: string): Locator {
    return this.page.getByRole('button', { name: `Mark not done: ${text}`, exact: true });
  }
}
