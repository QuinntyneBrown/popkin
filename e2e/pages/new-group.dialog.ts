import type { Locator, Page } from '@playwright/test';

/** New group (L2-147). */
export class NewGroupDialog {
  readonly root: Locator;
  readonly panel: Locator;
  readonly heading: Locator;
  readonly close: Locator;
  readonly name: Locator;
  readonly nameError: Locator;
  readonly kind: Locator;
  readonly whoIn: Locator;
  readonly addPeople: Locator;
  readonly note: Locator;
  readonly noteError: Locator;
  readonly noteHint: Locator;
  readonly summary: Locator;
  readonly make: Locator;
  readonly failed: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('dialog', { name: 'New group' });
    this.panel = this.root.locator('.dialog__panel');
    this.heading = this.root.getByRole('heading', { level: 2 }).first();
    this.close = this.root.getByRole('button', { name: 'Close' });
    this.name = this.root.getByRole('textbox', { name: 'Name' });
    this.nameError = this.root.locator('#gname-err');
    this.kind = this.root.getByRole('radiogroup', { name: 'What kind' });
    this.whoIn = this.root.locator('.person-pick');
    this.addPeople = this.root.getByRole('button', { name: 'Add people' });
    this.note = this.root.getByRole('textbox', { name: 'Note' });
    this.noteError = this.root.locator('#gnote-err');
    this.noteHint = this.root.getByText('Optional. Only you can see it.');
    this.summary = this.root.locator('.form-summary');
    this.make = this.root.locator('.dialog__footer').getByRole('button');
    this.failed = this.root.locator('.alert');
  }

  kindChoice(label: string): Locator {
    return this.kind.getByRole('radio', { name: label });
  }

  takeOut(first: string): Locator {
    return this.whoIn.getByRole('button', { name: `Take ${first} out` });
  }
}
