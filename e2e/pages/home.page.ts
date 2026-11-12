import type { Locator, Page } from '@playwright/test';

/** The placeholder first screen; it goes when the first journey is implemented. */
export class HomePage {
  readonly root: Locator;
  readonly heading: Locator;

  constructor(page: Page) {
    this.root = page.locator('body[data-page="home"]');
    this.heading = page.getByRole('heading', { level: 1 });
  }
}
