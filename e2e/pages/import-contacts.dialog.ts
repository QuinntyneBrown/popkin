import type { Locator, Page } from '@playwright/test';

/** Import from your Popkins (L2-151). */
export class ImportContactsDialog {
  readonly root: Locator;
  readonly panel: Locator;
  readonly heading: Locator;
  readonly description: Locator;
  /** "Tick nobody", or "Tick everyone" once nobody is ticked. */
  readonly tickAll: Locator;
  readonly sections: Locator;
  readonly import: Locator;
  readonly notNow: Locator;
  readonly close: Locator;
  readonly loading: Locator;
  readonly failed: Locator;
  readonly tryAgain: Locator;
  readonly emptyHeading: Locator;
  readonly emptyText: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('dialog', { name: 'Import from your Popkins' });
    this.panel = this.root.locator('.dialog__panel');
    this.heading = this.root.getByRole('heading', { level: 2 }).first();
    this.description = this.root.locator('.dialog__desc');
    this.tickAll = this.root.getByRole('button', { name: /^Tick (nobody|everyone)$/ });
    this.sections = this.root.locator('section');
    this.import = this.root.locator('.dialog__footer').getByRole('button', { name: /^Import/ });
    this.notNow = this.root.getByRole('button', { name: 'Not now' });
    this.close = this.root.locator('.dialog__footer').getByRole('button', { name: 'Close' });
    this.loading = this.root.getByRole('status');
    this.failed = this.root.locator('.alert');
    this.tryAgain = this.failed.getByRole('button', { name: 'Try again' });
    this.emptyHeading = this.root.getByRole('heading', { level: 3 });
    this.emptyText = this.root.locator('.empty p');
  }

  /** A Popkin's section, by its name. */
  section(popkin: string): Locator {
    return this.root.getByRole('region', { name: popkin });
  }

  /** The list of a Popkin's people. */
  list(popkin: string): Locator {
    return this.section(popkin).getByRole('list', { name: popkin });
  }

  person(popkin: string, name: string): Locator {
    return this.list(popkin).getByRole('checkbox', { name });
  }

  showMore(popkin: string): Locator {
    return this.section(popkin).getByRole('button', { name: /^Show \d+ more$/ });
  }
}
