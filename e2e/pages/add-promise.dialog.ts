import type { Locator, Page } from '@playwright/test';

/** Add a promise, from Log a conversation (known gap 106, ruled). */
export class AddPromiseDialog {
  readonly root: Locator;
  readonly panel: Locator;
  readonly heading: Locator;
  readonly close: Locator;
  readonly text: Locator;
  readonly remind: Locator;
  readonly add: Locator;

  constructor(private readonly page: Page) {
    this.root = page.getByRole('dialog', { name: 'Add a promise' });
    this.panel = this.root.locator('.dialog__panel');
    this.heading = this.root.getByRole('heading', { level: 2 });
    this.close = this.root.getByRole('button', { name: 'Close' });
    this.text = this.root.getByRole('textbox', { name: 'What you said you’d do' });
    this.remind = this.root.getByLabel('Remind me', { exact: true });
    this.add = this.root.getByRole('button', { name: 'Add the promise' });
  }

  error(text: string): Locator {
    return this.root.getByText(text, { exact: true });
  }
}
