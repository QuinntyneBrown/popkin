import type { Locator, Page } from '@playwright/test';

/** "Delete this experience?": the confirm before an experience is deleted (L2-040 AC6). */
export class DeleteExperienceDialog {
  readonly root: Locator;
  readonly panel: Locator;
  readonly heading: Locator;
  readonly description: Locator;
  readonly close: Locator;
  /** "Delete", which reads "Deleting…" while it is sent. */
  readonly delete: Locator;
  /** "Keep it": where the focus starts. */
  readonly keep: Locator;
  /** The alert of a delete that did not go through. */
  readonly failed: Locator;
  /** Regions for the sweeps and the parity specs. */
  readonly body: Locator;
  readonly footer: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('dialog', { name: 'Delete this experience?' });
    this.panel = this.root.locator('.dialog__panel');
    this.heading = this.root.getByRole('heading', { level: 2 });
    this.description = this.root.locator('.dialog__desc');
    this.close = this.root.getByRole('button', { name: 'Close' });
    this.body = this.root.locator('.dialog__body');
    this.footer = this.root.locator('.dialog__footer');
    // A link in the mock, which goes on to the list; a button in the app.
    this.delete = this.footer.locator('.btn--danger');
    this.keep = this.footer.locator('.btn--secondary');
    this.failed = this.root.locator('.alert--danger');
  }
}
