import type { Locator, Page } from '@playwright/test';

/** "There’s no page here" and "Something went wrong on our side" (L2-089 AC5, AC6). */
export class AdminErrorPage {
  readonly root: Locator;
  readonly heading: Locator;
  readonly code: Locator;
  readonly goToDashboard: Locator;
  readonly tryAgain: Locator;
  readonly openHealth: Locator;
  /** Regions for the sweeps and the parity specs. */
  readonly card: Locator;

  constructor(page: Page, pageId: 'not-found' | 'server-error') {
    this.root = page.locator(`body[data-page="${pageId}"]`);
    this.heading = page.getByRole('heading', { level: 1 });
    this.code = page.locator('.empty__code');
    this.goToDashboard = page.getByRole('link', { name: 'Go to the dashboard' });
    this.tryAgain = page.getByRole('link', { name: 'Try again' });
    this.openHealth = page.getByRole('link', { name: 'Open Health' });
    this.card = page.locator('.admin-entry__card');
  }
}
