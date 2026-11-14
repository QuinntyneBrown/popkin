import type { Locator, Page } from '@playwright/test';

/** "How long should it last?" (L2-020 AC4, AC6): the Host changes when the Popkin wraps up. */
export class ChangeLengthDialog {
  readonly root: Locator;
  readonly panel: Locator;
  readonly header: Locator;
  readonly heading: Locator;
  readonly description: Locator;
  readonly close: Locator;
  readonly body: Locator;
  readonly footer: Locator;
  readonly group: Locator;
  readonly options: Locator;
  readonly checked: Locator;
  /** "Ends Sun, 13 Sep · 6:00 pm", under "Until a date" once it is chosen. */
  readonly endDate: Locator;
  /** "Save", or "Saving…" while it goes. */
  readonly save: Locator;
  readonly cancel: Locator;
  readonly alert: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('dialog', { name: 'How long should it last?' });
    this.panel = this.root.locator('.dialog__panel');
    this.header = this.root.locator('.dialog__header');
    this.heading = this.root.getByRole('heading', { level: 2 });
    this.description = this.root.locator('.dialog__desc');
    this.close = this.root.getByRole('button', { name: 'Close' });
    this.body = this.root.locator('.dialog__body');
    this.footer = this.root.locator('.dialog__footer');
    this.group = this.root.getByRole('radiogroup', { name: 'How long it lasts' });
    this.options = this.group.getByRole('radio');
    this.checked = this.group.getByRole('radio', { checked: true });
    this.endDate = this.root.getByRole('button', { name: /^Ends / });
    this.save = this.footer.getByRole('button', { name: /^(Save|Saving…)$/ });
    this.cancel = this.footer.getByRole('button', { name: 'Cancel' });
    this.alert = this.root.locator('.alert');
  }

  /** The length by its title: "Keep it going". */
  option(title: string): Locator {
    return this.group.getByRole('radio', { name: new RegExp(`^${title}`) });
  }
}
