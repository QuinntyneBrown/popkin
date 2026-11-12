import type { Locator, Page } from '@playwright/test';

/** The server-error screen (L2-056 AC6). */
export class ServerErrorPage {
  readonly root: Locator;
  readonly heading: Locator;
  readonly reference: Locator;
  readonly tryAgain: Locator;
  readonly myPopkins: Locator;
  /** Regions for the parity specs. */
  readonly emptyState: Locator;
  readonly icon: Locator;
  readonly code: Locator;

  constructor(page: Page) {
    this.root = page.locator('body[data-page="server-error"]');
    this.heading = page.getByRole('heading', { level: 1 });
    this.reference = page.locator('.empty__code');
    this.tryAgain = page.getByRole('link', { name: 'Try again' });
    this.myPopkins = page.getByRole('link', { name: 'My Popkins' });
    this.emptyState = page.locator('.empty');
    this.icon = page.locator('.empty__icon');
    this.code = page.locator('.empty__code');
  }
}
