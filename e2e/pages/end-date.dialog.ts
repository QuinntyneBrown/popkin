import type { Locator, Page } from '@playwright/test';

/** The End date dialog, "When does it wrap up?" (L2-009 AC2, AC3). */
export class EndDateDialog {
  readonly root: Locator;
  readonly title: Locator;
  readonly day: Locator;
  readonly time: Locator;
  readonly error: Locator;
  readonly setTheEnd: Locator;
  readonly close: Locator;
  /** Regions for the parity specs. */
  readonly panel: Locator;
  readonly header: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('dialog', { name: 'When does it wrap up?' });
    this.title = this.root.getByRole('heading', { level: 2 });
    this.day = this.root.getByLabel('Day');
    this.time = this.root.getByLabel('Time');
    this.error = page.locator('#time-err');
    this.setTheEnd = this.root.getByRole('button', { name: 'Set the end' });
    this.close = this.root.getByRole('button', { name: 'Close' });
    this.panel = page.locator('.dialog__panel');
    this.header = page.locator('.dialog__header');
  }
}
