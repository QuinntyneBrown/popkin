import type { Locator, Page } from '@playwright/test';

/** "Delete {first name}?" (L2-132), over the profile or Edit. */
export class DeleteContactDialog {
  readonly root: Locator;
  readonly panel: Locator;
  readonly heading: Locator;
  readonly description: Locator;
  readonly alert: Locator;
  readonly close: Locator;

  constructor(private readonly page: Page) {
    this.root = page.getByRole('dialog');
    this.panel = this.root.locator('.dialog__panel');
    this.heading = this.root.getByRole('heading', { level: 2 });
    this.description = this.root.locator('.dialog__desc');
    this.alert = this.root.getByRole('alert');
    this.close = this.root.getByRole('button', { name: 'Close' });
  }

  confirm(firstName: string): Locator {
    return this.root.getByRole('button', { name: `Delete ${firstName}` });
  }

  keep(firstName: string): Locator {
    return this.root.getByRole('button', { name: `Keep ${firstName}` });
  }

  get deleting(): Locator {
    return this.root.getByRole('button', { name: 'Deleting…' });
  }
}
