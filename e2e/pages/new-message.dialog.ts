import type { Locator, Page } from '@playwright/test';

/** "New message": the Popkin's other members, to start a direct message (L2-022 AC4). */
export class NewMessageDialog {
  readonly root: Locator;
  readonly heading: Locator;
  readonly close: Locator;
  readonly search: Locator;
  readonly members: Locator;
  /** "Nobody by that name" and who can be messaged here. */
  readonly noResults: Locator;
  /** Regions for the sweeps and the parity specs. */
  readonly panel: Locator;
  readonly searchField: Locator;
  readonly list: Locator;

  constructor(private readonly page: Page) {
    this.root = page.getByRole('dialog', { name: 'New message' });
    this.heading = this.root.getByRole('heading', { level: 2, name: 'New message' });
    this.close = this.root.getByRole('button', { name: 'Close' });
    this.search = this.root.getByRole('searchbox', { name: 'Search members' });
    this.members = this.root.locator('.divided .row');
    this.noResults = this.root.locator('.empty');
    this.panel = this.root.locator('.dialog__panel');
    this.searchField = this.root.locator('.search');
    this.list = this.root.locator('.divided');
  }

  /** The member with this name. */
  member(name: string): Locator {
    return this.members.filter({ has: this.page.locator('.row__title', { hasText: name }) });
  }
}
