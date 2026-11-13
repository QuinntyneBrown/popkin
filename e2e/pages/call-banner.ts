import type { Locator, Page } from '@playwright/test';

/** The banner of a group call under way, on the Popkin home and in the Everyone thread. */
export class CallBanner {
  readonly root: Locator;
  readonly text: Locator;
  readonly join: Locator;
  readonly return: Locator;

  constructor(page: Page) {
    this.root = page.locator('.banner--popkin');
    this.text = this.root.locator('.banner__text');
    this.join = this.root.getByRole('link', { name: 'Join' });
    this.return = this.root.getByRole('link', { name: 'Return' });
  }
}
