import type { Locator, Page } from '@playwright/test';

/** "Edit name and look" (L2-020 AC3, AC6): the Host's name, emoji and colour for the Popkin. */
export class EditPopkinDialog {
  readonly root: Locator;
  readonly panel: Locator;
  readonly header: Locator;
  readonly heading: Locator;
  readonly description: Locator;
  readonly close: Locator;
  readonly body: Locator;
  readonly footer: Locator;
  readonly name: Locator;
  readonly nameError: Locator;
  readonly emoji: Locator;
  readonly colours: Locator;
  /** "Save", or "Saving…" while it goes. */
  readonly save: Locator;
  readonly cancel: Locator;
  readonly alert: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('dialog', { name: 'Edit name and look' });
    this.panel = this.root.locator('.dialog__panel');
    this.header = this.root.locator('.dialog__header');
    this.heading = this.root.getByRole('heading', { level: 2 });
    this.description = this.root.locator('.dialog__desc');
    this.close = this.root.getByRole('button', { name: 'Close' });
    this.body = this.root.locator('.dialog__body');
    this.footer = this.root.locator('.dialog__footer');
    this.name = this.root.getByLabel('Name', { exact: true });
    this.nameError = this.root.locator('.field__error');
    this.emoji = this.root.getByRole('group', { name: 'Emoji' });
    this.colours = this.root.getByRole('group', { name: 'Colour' });
    this.save = this.footer.getByRole('button', { name: /^(Save|Saving…)$/ });
    this.cancel = this.footer.getByRole('button', { name: 'Cancel' });
    this.alert = this.root.locator('.alert');
  }

  /** The emoji by the name assistive technology reads: "Party popper". */
  emojiNamed(name: string): Locator {
    return this.emoji.getByRole('button', { name });
  }

  colourNamed(name: string): Locator {
    return this.colours.getByRole('button', { name });
  }
}
