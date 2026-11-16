import type { Locator, Page } from '@playwright/test';
import { ContactsNav } from './contacts-nav';

/** People, `/contacts/people` (L2-126, L2-127). */
export class ContactsPeoplePage {
  readonly root: Locator;
  readonly nav: ContactsNav;
  readonly heading: Locator;
  readonly sub: Locator;
  readonly connections: Locator;
  readonly addSomeone: Locator;
  readonly search: Locator;
  readonly circles: Locator;
  readonly closest: Locator;
  readonly closestPeople: Locator;
  /** The list of people, named "Everyone" or by its circle. */
  readonly list: Locator;
  readonly rows: Locator;
  readonly loading: Locator;
  /** The empty, failed and no-results states. */
  readonly state: Locator;
  readonly stateHeading: Locator;
  readonly stateText: Locator;
  readonly tryAgain: Locator;
  /** Regions for the sweeps and the parity specs. */
  readonly pageHead: Locator;
  readonly firstRow: Locator;
  readonly closestStrip: Locator;
  readonly loadingRows: Locator;

  constructor(private readonly page: Page) {
    this.root = page.locator('body[data-page="contacts-people"]');
    this.nav = new ContactsNav(page);
    this.heading = page.getByRole('heading', { level: 1 });
    this.pageHead = page.locator('.page-head');
    this.sub = this.pageHead.locator('.page-head__sub');
    this.connections = this.pageHead.getByRole('link', { name: 'Connections' });
    this.addSomeone = this.pageHead.getByRole('link', { name: 'Add someone' });
    this.search = page.getByRole('searchbox', { name: 'Search by name' });
    this.circles = page.getByRole('group', { name: 'Circle' });
    this.closest = page.getByRole('region', { name: 'Closest' });
    this.closestPeople = this.closest.getByRole('link');
    this.list = page.locator('ul.divided');
    this.rows = this.list.locator('.contact-row');
    this.closestStrip = page.locator('.closest');
    this.loadingRows = page.locator('.contact-list__loading');
    this.firstRow = this.rows.first();
    this.loading = page.getByRole('status').filter({ hasText: 'Loading your people…' });
    this.state = page.locator('.empty');
    this.stateHeading = this.state.getByRole('heading');
    this.stateText = this.state.locator('p');
    this.tryAgain = page.getByRole('button', { name: 'Try again' });
  }

  circle(name: string): Locator {
    return this.circles.getByRole('button', { name: new RegExp(`^${name}\\s*\\d*$`) });
  }

  row(name: string): Locator {
    return this.rows.filter({ hasText: name });
  }

  stateAction(name: string): Locator {
    return this.state.getByRole('link', { name });
  }
}
