import type { Locator, Page } from '@playwright/test';

/** The console's frame (admin shell design): the sidebar from 1024 px, the bar below it. */
export class AdminShell {
  readonly shell: Locator;
  readonly side: Locator;
  readonly bar: Locator;
  readonly nav: Locator;
  /** The section the page belongs to, marked in the sidebar. */
  readonly current: Locator;
  /** The signed-in admin at the foot of the sidebar. */
  readonly me: Locator;
  readonly signOut: Locator;
  readonly openMenu: Locator;
  readonly notice: Locator;
  /** Regions for the sweeps and the parity specs. */
  readonly accessGroup: Locator;

  constructor(page: Page) {
    this.shell = page.locator('.admin-shell');
    this.side = page.locator('.admin-shell__side');
    this.bar = page.locator('.admin-shell__bar');
    this.nav = this.side.getByRole('navigation', { name: 'Admin' });
    this.current = this.nav.locator('[aria-current="page"]');
    this.me = this.side.locator('.admin-nav__me');
    this.signOut = this.side.getByRole('button', { name: 'Sign out' });
    this.openMenu = this.bar.getByRole('button', { name: 'Open menu' });
    this.notice = page.locator('.admin-shell__notice');
    this.accessGroup = this.side.locator('.admin-nav__group').last();
  }
}
