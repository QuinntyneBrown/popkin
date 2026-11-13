import type { Locator, Page } from '@playwright/test';

/** The recap of a wrapped-up Popkin (`docs/mocks/pages/wrapped-up/`). */
export class RecapPage {
  readonly root: Locator;

  constructor(readonly page: Page) {
    this.root = page.locator('body[data-page="wrapped-up"]');
  }
}
