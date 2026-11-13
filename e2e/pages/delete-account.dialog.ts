import type { Locator, Page } from '@playwright/test';

/** "Delete your account?": what goes, what stays, and "delete" typed to confirm (L2-049). */
export class DeleteAccountDialog {
  readonly root: Locator;
  readonly panel: Locator;
  readonly heading: Locator;
  readonly description: Locator;
  readonly close: Locator;
  /** "You host N active Popkins", naming them (L2-049 AC3). */
  readonly hosted: Locator;
  /** "Removed: …" and "Kept, without your name: …" (L2-049 AC1). */
  readonly removed: Locator;
  readonly kept: Locator;
  readonly confirm: Locator;
  /** "Delete my account", which reads "Deleting…" while it is sent. */
  readonly delete: Locator;
  readonly keep: Locator;
  /** The alert of a deletion that did not go through. */
  readonly failed: Locator;
  /** Regions for the sweeps and the parity specs. */
  readonly body: Locator;
  readonly footer: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('dialog', { name: 'Delete your account?' });
    this.panel = this.root.locator('.dialog__panel');
    this.heading = this.root.getByRole('heading', { level: 2 });
    this.description = this.root.locator('.dialog__desc');
    this.close = this.root.getByRole('button', { name: 'Close' });
    this.body = this.root.locator('.dialog__body');
    this.footer = this.root.locator('.dialog__footer');
    this.hosted = this.body.locator('.alert--warning');
    this.removed = this.body.getByRole('listitem').filter({ hasText: /^Removed:/ });
    this.kept = this.body.getByRole('listitem').filter({ hasText: /^Kept, without your name:/ });
    this.confirm = this.root.getByRole('textbox', { name: 'Type delete to confirm' });
    // A link in the confirm mock, which goes on to the landing page; a button in the app.
    this.delete = this.footer.locator('.btn--danger');
    this.keep = this.footer.getByRole('button', { name: 'Keep my account' });
    this.failed = this.body.locator('.alert--danger');
  }
}
