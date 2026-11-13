import type { Locator, Page } from '@playwright/test';

/**
 * The actions of an experience, for its sharer and the Host (L2-040 AC6): a dialog named by the
 * experience's title, with a row for each thing they can do.
 */
export class ExperienceActionsDialog {
  readonly root: Locator;
  readonly panel: Locator;
  /** The dialog is named by the experience's title. */
  readonly heading: Locator;
  readonly close: Locator;
  readonly menu: Locator;
  readonly items: Locator;
  /** "Edit": the sharer's only. */
  readonly edit: Locator;
  /** "Delete": the sharer's and the Host's. */
  readonly delete: Locator;
  /** Regions for the sweeps and the parity specs. */
  readonly body: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('dialog');
    this.panel = this.root.locator('.dialog__panel');
    this.heading = this.root.getByRole('heading', { level: 2 });
    this.close = this.root.getByRole('button', { name: 'Close' });
    this.body = this.root.locator('.dialog__body');
    this.menu = this.body.locator('.menu-list');
    this.items = this.menu.locator('.menu-list__item');
    // A link in the mocks, which go from one to the next; a button in the app.
    this.edit = this.items.filter({ hasText: 'Edit' });
    this.delete = this.items.filter({ hasText: 'Delete' });
  }
}
