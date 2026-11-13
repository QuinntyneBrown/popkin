import type { Locator, Page } from '@playwright/test';

/**
 * The warnings of a Popkin near its end and after it: "1 hour left." on the Popkin home, with
 * the Host's "Change" (L2-044 AC2), and "Photos go in 12 days." on the album that was not kept
 * (L2-045 AC4).
 */
export class WrapUpBanner {
  readonly root: Locator;
  readonly text: Locator;
  /** The time left, or the days left, in bold. */
  readonly lead: Locator;
  /** "Change", named "Change how long it lasts": the Host's. "Save" on the album's. */
  readonly action: Locator;
  readonly dismiss: Locator;

  constructor(page: Page) {
    this.root = page.locator('.banner--warning');
    this.text = this.root.locator('.banner__text');
    this.lead = this.text.locator('strong');
    this.action = this.root.locator('.banner__action');
    this.dismiss = this.root.getByRole('button', { name: 'Dismiss' });
  }
}
