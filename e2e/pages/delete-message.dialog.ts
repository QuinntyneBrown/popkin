import type { Locator, Page } from '@playwright/test';

/** "Delete this message?": the confirm before a member deletes their own message. */
export class DeleteMessageDialog {
  readonly root: Locator;
  readonly panel: Locator;
  readonly heading: Locator;
  readonly description: Locator;
  readonly delete: Locator;
  readonly keep: Locator;
  readonly body: Locator;
  readonly footer: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('dialog', { name: 'Delete this message?' });
    this.panel = this.root.locator('.dialog__panel');
    this.heading = this.root.getByRole('heading', { level: 2 });
    this.description = this.root.locator('.dialog__desc');
    this.body = this.root.locator('.dialog__body');
    this.footer = this.root.locator('.dialog__footer');
    this.delete = this.root.getByRole('button', { name: 'Delete', exact: true });
    this.keep = this.root.getByRole('button', { name: 'Keep', exact: true });
  }
}
