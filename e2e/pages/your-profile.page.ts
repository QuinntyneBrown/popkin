import type { Locator, Page } from '@playwright/test';

/** The profile step of joining, `/i/:code/profile` (L2-013). */
export class YourProfilePage {
  readonly root: Locator;
  readonly heading: Locator;
  readonly popkin: Locator;
  readonly back: Locator;
  readonly name: Locator;
  readonly hint: Locator;
  readonly nameError: Locator;
  /** The photo picker's button, named "Add a photo" or "Change your photo". */
  readonly photo: Locator;
  readonly addAPhoto: Locator;
  readonly changeYourPhoto: Locator;
  readonly photoPreview: Locator;
  readonly initial: Locator;
  readonly photoCaption: Locator;
  readonly photoError: Locator;
  readonly imIn: Locator;
  readonly joining: Locator;
  readonly alert: Locator;
  readonly screen: Locator;
  /** The picture half of the split screen, from 768 px (L2-058 AC10). */
  readonly picture: Locator;
  readonly people: Locator;
  readonly names: Locator;
  readonly avatars: Locator;
  readonly more: Locator;
  /** Regions for the sweeps and the parity specs. */
  readonly nameField: Locator;
  readonly peopleList: Locator;
  readonly topBar: Locator;

  private readonly file: Locator;

  constructor(page: Page) {
    this.root = page.locator('body[data-page="your-profile"]');
    this.heading = page.getByRole('heading', { level: 1 });
    this.topBar = page.locator('.topbar');
    this.popkin = page.locator('.topbar__title');
    this.back = page.getByRole('link', { name: 'Back' });
    this.name = page.getByRole('textbox', { name: 'Your name' });
    this.hint = page.locator('.field__hint');
    this.nameError = page.locator('.field__error');
    this.nameField = page.locator('.field');
    this.photo = page.getByRole('button', { name: /photo/ });
    this.addAPhoto = page.getByRole('button', { name: 'Add a photo' });
    this.changeYourPhoto = page.getByRole('button', { name: 'Change your photo' });
    this.photoPreview = this.photo.locator('img');
    this.initial = this.photo.locator('.avatar');
    this.photoCaption = page.getByText(/^(A photo is optional|Looking good\.)$/);
    this.photoError = page.locator('.photo-picker__error');
    this.imIn = page.getByRole('button', { name: 'I’m in' });
    this.joining = page.getByRole('button', { name: 'Joining…' });
    this.alert = page.getByRole('main').locator('.alert');
    this.screen = page.locator('.screen');
    this.picture = page.getByRole('complementary', { name: 'Already here' });
    this.peopleList = this.picture.getByRole('list');
    this.people = this.picture.getByRole('listitem');
    this.avatars = this.people.locator('.avatar');
    this.names = this.people.locator('.avatar + span');
    this.more = this.picture.getByText(/^and \d+ more$/);
    this.file = page.locator('input[type="file"]');
  }

  /** Chooses a photo as the device's file picker would hand it over. */
  async choosePhoto(file: string | { name: string; mimeType: string; buffer: Buffer }) {
    await this.file.setInputFiles(file);
  }
}
