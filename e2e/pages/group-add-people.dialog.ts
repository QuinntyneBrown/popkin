import type { Locator, Page } from '@playwright/test';

/** Add people to a group (L2-147 AC3, AC4). */
export class GroupAddPeopleDialog {
  readonly root: Locator;
  readonly panel: Locator;
  readonly heading: Locator;
  readonly search: Locator;
  readonly list: Locator;
  readonly rows: Locator;
  readonly add: Locator;
  readonly failed: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('dialog', { name: /^Add people to / });
    this.panel = this.root.locator('.dialog__panel');
    this.heading = this.root.getByRole('heading', { level: 2 }).first();
    this.search = this.root.getByRole('searchbox', { name: 'Search your people' });
    this.list = this.root.getByRole('list', { name: 'Your people' });
    this.rows = this.list.locator('li');
    this.add = this.root.locator('.dialog__footer').getByRole('button');
    this.failed = this.root.locator('.alert');
  }

  person(name: string): Locator {
    return this.list.getByRole('checkbox', { name });
  }
}
