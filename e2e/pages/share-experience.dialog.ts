import type { Locator, Page } from '@playwright/test';

type Chosen = { name: string; mimeType: string; buffer: Buffer };

/** "Share an experience": its title, kind, when, place and picture (L2-040). */
export class ShareExperienceDialog {
  readonly root: Locator;
  readonly panel: Locator;
  readonly heading: Locator;
  readonly close: Locator;
  readonly title: Locator;
  readonly titleError: Locator;
  readonly kinds: Locator;
  readonly when: Locator;
  readonly place: Locator;
  readonly placeError: Locator;
  readonly addPicture: Locator;
  readonly picture: Locator;
  readonly removePicture: Locator;
  readonly pictureError: Locator;
  readonly summary: Locator;
  readonly failed: Locator;
  readonly action: Locator;
  /** Regions for the sweeps and the parity specs. */
  readonly body: Locator;
  readonly footer: Locator;
  readonly titleField: Locator;
  readonly whenField: Locator;
  readonly placeField: Locator;
  readonly kindField: Locator;
  private readonly picker: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('dialog', { name: 'Share an experience' });
    this.panel = this.root.locator('.dialog__panel');
    this.heading = this.root.getByRole('heading', { level: 2, name: 'Share an experience' });
    this.close = this.root.getByRole('button', { name: 'Close' });
    this.body = this.root.locator('.dialog__body');
    this.footer = this.root.locator('.dialog__footer');
    this.title = this.root.getByLabel('Title', { exact: true });
    this.titleField = this.body.locator('.field', {
      has: page.getByLabel('Title', { exact: true }),
    });
    this.titleError = this.titleField.locator('.field__error');
    this.kinds = this.root.getByRole('radiogroup', { name: 'Kind' });
    this.kindField = this.kinds.locator('..');
    this.when = this.root.getByLabel('When');
    this.whenField = this.body.locator('.field', { has: page.getByLabel('When') });
    this.place = this.root.getByLabel('Place');
    this.placeField = this.body.locator('.field', { has: page.getByLabel('Place') });
    this.placeError = this.placeField.locator('.field__error');
    this.addPicture = this.root.locator('.date-btn');
    this.picture = this.root.getByRole('img', { name: 'The picture you chose' });
    this.removePicture = this.root.getByRole('button', { name: 'Remove picture' });
    this.pictureError = this.root.locator('.picture-field .field__error');
    this.summary = this.root.locator('.form-summary');
    this.failed = this.root.locator('.alert--danger');
    this.action = this.footer.getByRole('button');
    this.picker = this.root.locator('input[type="file"]');
  }

  /** One of the three kinds: "Something we did", "Restaurant", "Want to do". */
  kind(name: string): Locator {
    return this.kinds.getByRole('radio', { name, exact: true });
  }

  /** Chooses this file in the device's picker, as "Add a picture" lets a member do. */
  async choose(file: Chosen): Promise<void> {
    await this.picker.setInputFiles(file);
  }
}
