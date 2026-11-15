import type { Locator, Page } from '@playwright/test';

/** The screen for a code that was right but is not an admin's (L2-078 AC2). */
export class NotAnAdminPage {
  readonly root: Locator;
  readonly heading: Locator;
  readonly goToPopkin: Locator;
  readonly tryAnotherEmail: Locator;
  /** Regions for the sweeps and the parity specs. */
  readonly card: Locator;
  readonly emptyState: Locator;

  constructor(page: Page) {
    this.root = page.locator('body[data-page="not-an-admin"]');
    this.heading = page.getByRole('heading', { level: 1 });
    this.goToPopkin = page.getByRole('link', { name: 'Go to Popkin' });
    this.tryAnotherEmail = page.getByRole('link', { name: 'Try another email' });
    this.card = page.locator('.admin-entry__card');
    this.emptyState = page.locator('.empty');
  }
}
