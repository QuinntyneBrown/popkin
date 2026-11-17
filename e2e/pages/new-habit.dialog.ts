import type { Locator, Page } from '@playwright/test';

/** New habit (L2-145), from Habits or a profile. */
export class NewHabitDialog {
  readonly root: Locator;
  readonly panel: Locator;
  readonly heading: Locator;
  readonly close: Locator;
  /** "With" as the contact, from a profile. */
  readonly withPerson: Locator;
  readonly change: Locator;
  /** "With" as a choice, from Habits or after Change. */
  readonly withChoice: Locator;
  readonly withError: Locator;
  readonly what: Locator;
  readonly whatError: Locator;
  readonly howOften: Locator;
  readonly hint: Locator;
  readonly summary: Locator;
  readonly start: Locator;
  readonly failed: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('dialog', { name: 'New habit' });
    this.panel = this.root.locator('.dialog__panel');
    this.heading = this.root.getByRole('heading', { level: 2 }).first();
    this.close = this.root.getByRole('button', { name: 'Close' });
    this.withPerson = this.root.locator('.person-pick');
    this.change = this.withPerson.getByRole('button', { name: 'Change' });
    this.withChoice = this.root.getByRole('combobox', { name: 'With' });
    this.withError = this.root.locator('#with-err');
    this.what = this.root.getByRole('textbox', { name: 'What' });
    this.whatError = this.root.locator('#what-err');
    this.howOften = this.root.getByRole('radiogroup', { name: 'How often' });
    this.hint = this.root.getByText(
      'We’ll remind you when it’s due, and nudge again if a week slips by.',
    );
    this.summary = this.root.locator('.form-summary');
    this.start = this.root.locator('.dialog__footer').getByRole('button');
    this.failed = this.root.locator('.alert');
  }

  often(label: string): Locator {
    return this.howOften.getByRole('radio', { name: label, exact: true });
  }
}
