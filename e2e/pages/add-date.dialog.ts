import type { Locator, Page } from '@playwright/test';

/** Add a date (L2-138), over Dates or a profile. */
export class AddDateDialog {
  readonly root: Locator;
  readonly panel: Locator;
  readonly heading: Locator;
  readonly close: Locator;
  /** From Dates, a select of my people; from a profile, that contact. */
  readonly forWho: Locator;
  readonly forContact: Locator;
  readonly kinds: Locator;
  readonly title: Locator;
  readonly day: Locator;
  readonly remind: Locator;
  readonly everyYear: Locator;
  readonly save: Locator;
  readonly saving: Locator;
  readonly summary: Locator;
  readonly alert: Locator;

  constructor(private readonly page: Page) {
    this.root = page.getByRole('dialog', { name: 'Add a date' });
    this.panel = this.root.locator('.dialog__panel');
    this.heading = this.root.getByRole('heading', { level: 2 });
    this.close = this.root.getByRole('button', { name: 'Close' });
    this.forWho = this.root.getByRole('combobox', { name: 'For' });
    this.forContact = this.root.locator('.person-pick');
    this.kinds = this.root.getByRole('radiogroup', { name: 'What kind' });
    this.title = this.root.getByRole('textbox', { name: 'What’s the day?' });
    this.day = this.root.getByLabel('The day', { exact: true });
    this.remind = this.root.getByRole('combobox', { name: 'Remind me' });
    this.everyYear = this.root.getByRole('switch', { name: 'Every year' });
    this.save = this.root.getByRole('button', { name: 'Save the date' });
    this.saving = this.root.getByRole('button', { name: 'Saving…' });
    this.summary = this.root.locator('.form-summary');
    this.alert = this.root.getByRole('alert');
  }

  kind(name: string): Locator {
    return this.kinds.getByRole('radio', { name });
  }

  error(text: string): Locator {
    return this.root.getByText(text, { exact: true });
  }
}
