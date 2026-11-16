import type { Locator, Page } from '@playwright/test';

/** "More for {first name}" (L2-131): a menu named by the contact's full name. */
export class ContactActionsDialog {
  readonly root: Locator;
  readonly panel: Locator;
  readonly heading: Locator;
  readonly close: Locator;
  readonly items: Locator;
  /** Regions for the sweeps and the parity specs. */
  readonly body: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('dialog');
    this.panel = this.root.locator('.dialog__panel');
    this.heading = this.root.getByRole('heading', { level: 2 });
    this.close = this.root.getByRole('button', { name: 'Close' });
    this.body = this.root.locator('.dialog__body');
    this.items = this.body.locator('.menu-list__item');
  }

  item(name: string | RegExp): Locator {
    return this.items.filter({ hasText: name });
  }
}
