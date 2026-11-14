import type { Locator, Page } from '@playwright/test';

/**
 * Popkin settings (L2-020): the menu the ⋯ of the Popkin home opens, named by the Popkin. The
 * Host has "Edit name and look", "Change how long it lasts", "Invite people" and "Wrap up"; a
 * member has "Invite people" and "Leave this Popkin".
 */
export class PopkinSettingsDialog {
  readonly root: Locator;
  readonly panel: Locator;
  /** The dialog is named by the Popkin. */
  readonly heading: Locator;
  readonly close: Locator;
  readonly body: Locator;
  readonly menu: Locator;
  readonly items: Locator;
  /** The Host's only. */
  readonly editLook: Locator;
  /** The Host's only. */
  readonly changeLength: Locator;
  readonly invitePeople: Locator;
  /** The Host's only. */
  readonly wrapUp: Locator;
  /** A member's only: the danger row. */
  readonly leave: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('dialog');
    this.panel = this.root.locator('.dialog__panel');
    this.heading = this.root.getByRole('heading', { level: 2 });
    this.close = this.root.getByRole('button', { name: 'Close' });
    this.body = this.root.locator('.dialog__body');
    this.menu = this.body.locator('.menu-list');
    this.items = this.menu.locator('.menu-list__item');
    // A link in the mocks, which go from one to the next; a button or a link in the app.
    this.editLook = this.items.filter({ hasText: 'Edit name and look' });
    this.changeLength = this.items.filter({ hasText: 'Change how long it lasts' });
    this.invitePeople = this.items.filter({ hasText: 'Invite people' });
    this.wrapUp = this.items.filter({ hasText: 'Wrap up' });
    this.leave = this.items.filter({ hasText: 'Leave this Popkin' });
  }
}
