import type { Locator, Page } from '@playwright/test';

/** "Leave Lakeside Weekend?": the confirm before a member leaves a Popkin (L2-047 AC1). */
export class LeavePopkinDialog {
  readonly root: Locator;
  readonly panel: Locator;
  /** Names the Popkin. */
  readonly heading: Locator;
  /** What stays, and how to come back. */
  readonly description: Locator;
  readonly close: Locator;
  /** "Leave", which reads "Leaving…" while it is sent. */
  readonly leave: Locator;
  /** "Stay": where the focus starts. */
  readonly stay: Locator;
  /** The alert of a leave that did not go through. */
  readonly failed: Locator;
  /** Regions for the sweeps and the parity specs. */
  readonly body: Locator;
  readonly footer: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('dialog', { name: /^Leave .+\?$/ });
    this.panel = this.root.locator('.dialog__panel');
    this.heading = this.root.getByRole('heading', { level: 2 });
    this.description = this.root.locator('.dialog__desc');
    this.close = this.root.getByRole('button', { name: 'Close' });
    this.body = this.root.locator('.dialog__body');
    this.footer = this.root.locator('.dialog__footer');
    // A link in the mock, which goes on to My Popkins; a button in the app.
    this.leave = this.footer.locator('.btn--danger');
    this.stay = this.footer.locator('.btn--secondary');
    this.failed = this.root.locator('.alert--danger');
  }
}
