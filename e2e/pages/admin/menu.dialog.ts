import type { Locator, Page } from '@playwright/test';

/** The menu drawer below 1024 px (L2-089 AC2): every section, and the admin signed in. */
export class AdminMenuDialog {
  readonly drawer: Locator;
  readonly close: Locator;
  readonly nav: Locator;
  readonly current: Locator;
  /** Regions for the sweeps and the parity specs. */
  readonly head: Locator;

  constructor(private readonly page: Page) {
    this.drawer = page.getByRole('dialog', { name: 'Menu' });
    this.close = this.drawer.getByRole('button', { name: 'Close menu' });
    this.nav = this.drawer.getByRole('navigation', { name: 'Admin' });
    this.current = this.nav.locator('[aria-current="page"]');
    this.head = page.locator('.admin-drawer');
  }

  section(name: string): Locator {
    return this.nav.getByRole('link', { name });
  }
}
