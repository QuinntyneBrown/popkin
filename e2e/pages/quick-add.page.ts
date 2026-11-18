import type { Locator, Page } from '@playwright/test';

/** Quick Add, `/contacts/quick-add` (L2-177 to L2-179). */
export class QuickAddPage {
  readonly root: Locator;
  readonly heading: Locator;
  readonly cancel: Locator;
  readonly save: Locator;
  readonly saving: Locator;
  readonly addPhoto: Locator;
  readonly photo: Locator;
  readonly name: Locator;
  readonly phoneLabel: Locator;
  readonly phone: Locator;
  readonly whoAreThey: Locator;
  readonly circle: Locator;
  readonly pickFromPhone: Locator;
  readonly failed: Locator;
  /** Regions for the sweeps and the parity specs. */
  readonly topBar: Locator;
  readonly form: Locator;
  /** The name's field, label and input, as the parity spec of `pk-text-field` compares it. */
  readonly nameField: Locator;

  constructor(page: Page) {
    this.root = page.locator('body[data-page="quick-add"]');
    this.topBar = page.locator('.topbar');
    this.form = page.locator('form#quick-add');
    this.heading = page.getByRole('heading', { level: 1 });
    this.cancel = this.topBar.getByRole('link', { name: 'Cancel' });
    this.save = this.topBar.getByRole('button', { name: 'Save' });
    this.saving = this.topBar.getByRole('button', { name: 'Saving…' });
    this.addPhoto = page.getByRole('button', { name: 'Add a photo' });
    this.photo = this.form.locator('.avatar img');
    this.name = page.getByRole('textbox', { name: 'Name' });
    this.nameField = this.form.locator('.field').filter({ has: this.name });
    this.phoneLabel = page.locator('label[for="phone"]');
    this.phone = page.getByRole('textbox', { name: 'Phone' });
    this.whoAreThey = page.getByRole('textbox', { name: 'Who are they?' });
    this.circle = page.getByRole('radiogroup', { name: 'Circle' });
    this.pickFromPhone = page.getByRole('button', { name: 'Pick from my phone’s contacts' });
    this.failed = page.locator('.banner');
  }

  circleChoice(name: string): Locator {
    return this.circle.getByRole('radio', { name });
  }
}
