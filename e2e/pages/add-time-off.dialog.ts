import type { Locator, Page } from '@playwright/test';

/**
 * "Add my time off" (L2-073): the member's own week, Monday to Friday, each Off, Tentative or
 * Working.
 */
export class AddTimeOffDialog {
  readonly root: Locator;
  readonly panel: Locator;
  readonly header: Locator;
  readonly heading: Locator;
  readonly description: Locator;
  readonly close: Locator;
  readonly body: Locator;
  readonly footer: Locator;
  /** A radio group per weekday, named "Mon 15". */
  readonly days: Locator;
  readonly rows: Locator;
  /** "Save", or "Saving…" while it goes. */
  readonly save: Locator;
  readonly alert: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('dialog', { name: 'Add my time off' });
    this.panel = this.root.locator('.dialog__panel');
    this.header = this.root.locator('.dialog__header');
    this.heading = this.root.getByRole('heading', { level: 2 });
    this.description = this.root.locator('.dialog__desc');
    this.close = this.root.getByRole('button', { name: 'Close' });
    this.body = this.root.locator('.dialog__body');
    this.footer = this.root.locator('.dialog__footer');
    this.days = this.root.getByRole('radiogroup');
    this.rows = this.root.locator('.leave-row');
    this.save = this.footer.getByRole('button', { name: /^(Save|Saving…)$/ });
    this.alert = this.root.locator('.alert');
  }

  /** A weekday's radio group: "Mon 15". */
  day(name: string): Locator {
    return this.root.getByRole('radiogroup', { name });
  }

  /** A weekday's choice: "Off", "Tentative" or "Working". */
  choice(day: string, kind: string): Locator {
    return this.day(day).getByRole('radio', { name: kind, exact: true });
  }

  /** The choice checked on each weekday, in order. */
  checked(): Locator {
    return this.days.getByRole('radio', { checked: true });
  }
}
