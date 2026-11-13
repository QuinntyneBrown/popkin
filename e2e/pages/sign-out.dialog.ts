import type { Locator, Page } from '@playwright/test';

/** "Sign out of Popkin?": the confirm before the session ends on this device (L2-048 AC5). */
export class SignOutDialog {
  readonly root: Locator;
  readonly panel: Locator;
  readonly heading: Locator;
  readonly description: Locator;
  readonly close: Locator;
  /** "Sign out", which reads "Signing out…" while it is sent. */
  readonly signOut: Locator;
  /** "Stay signed in": where the focus starts. */
  readonly stay: Locator;
  /** The alert of a sign out that did not go through. */
  readonly failed: Locator;
  /** Regions for the sweeps and the parity specs. */
  readonly footer: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('dialog', { name: 'Sign out of Popkin?' });
    this.panel = this.root.locator('.dialog__panel');
    this.heading = this.root.getByRole('heading', { level: 2 });
    this.description = this.root.locator('.dialog__desc');
    this.close = this.root.getByRole('button', { name: 'Close' });
    this.footer = this.root.locator('.dialog__footer');
    // A link in the mock, which goes on to the welcome screen; a button in the app.
    this.signOut = this.footer.locator('.btn--primary');
    this.stay = this.footer.locator('.btn--quiet');
    this.failed = this.root.locator('.alert--danger');
  }
}
