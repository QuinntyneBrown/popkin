import type { Locator, Page } from '@playwright/test';

/** "Set the event" (L2-085): the Host's label and first and last day of the event. */
export class SetEventDialog {
  readonly root: Locator;
  readonly panel: Locator;
  readonly header: Locator;
  readonly heading: Locator;
  readonly description: Locator;
  readonly close: Locator;
  readonly body: Locator;
  readonly footer: Locator;
  readonly label: Locator;
  readonly firstDay: Locator;
  readonly lastDay: Locator;
  /** The message of the rule broken, under its field. */
  readonly error: Locator;
  /** "Save", or "Saving…" while it goes. */
  readonly save: Locator;
  readonly remove: Locator;
  readonly alert: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('dialog', { name: 'Set the event' });
    this.panel = this.root.locator('.dialog__panel');
    this.header = this.root.locator('.dialog__header');
    this.heading = this.root.getByRole('heading', { level: 2 });
    this.description = this.root.locator('.dialog__desc');
    this.close = this.root.getByRole('button', { name: 'Close' });
    this.body = this.root.locator('.dialog__body');
    this.footer = this.root.locator('.dialog__footer');
    this.label = this.root.getByLabel('Label', { exact: true });
    this.firstDay = this.root.getByLabel('First day', { exact: true });
    this.lastDay = this.root.getByLabel('Last day', { exact: true });
    this.error = this.root.locator('.field__error');
    this.save = this.footer.getByRole('button', { name: /^(Save|Saving…)$/ });
    this.remove = this.footer.getByRole('button', { name: 'Remove the event' });
    this.alert = this.root.locator('.alert');
  }
}
