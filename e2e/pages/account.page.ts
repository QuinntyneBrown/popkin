import type { Locator, Page } from '@playwright/test';

/** "Your account", `/account` (L2-048). */
export class AccountPage {
  readonly root: Locator;
  readonly screen: Locator;
  readonly heading: Locator;
  /** The top bar's back link, to My Popkins. */
  readonly back: Locator;
  /** The photo picker: "Change your photo". */
  readonly photo: Locator;
  readonly photoPreview: Locator;
  readonly initials: Locator;
  readonly photoError: Locator;
  readonly name: Locator;
  readonly nameHint: Locator;
  readonly nameError: Locator;
  /** The sign-in contact, read-only: "Phone number" or "Email". */
  readonly contact: Locator;
  readonly contactHint: Locator;
  readonly theme: Locator;
  /** The visible "Theme" above the choices. */
  readonly themeLabel: Locator;
  readonly save: Locator;
  readonly saving: Locator;
  readonly saved: Locator;
  readonly summary: Locator;
  readonly failed: Locator;
  readonly signOut: Locator;
  readonly deleteAccount: Locator;
  /** The Sign out row, a link in the mock and a button in the app. */
  readonly signOutRow: Locator;
  readonly loading: Locator;
  readonly error: Locator;
  readonly tryAgain: Locator;
  readonly myPopkins: Locator;
  /** Regions for the sweeps and the parity specs. */
  readonly topBar: Locator;
  readonly picker: Locator;
  readonly fields: Locator;
  readonly segmented: Locator;
  readonly menu: Locator;
  readonly skeleton: Locator;
  readonly empty: Locator;

  private readonly file: Locator;

  constructor(private readonly page: Page) {
    this.root = page.locator('body[data-page="account"]');
    this.screen = page.locator('.screen');
    this.heading = page.getByRole('heading', { level: 1 });
    this.topBar = page.locator('.topbar');
    this.back = this.topBar.getByRole('link', { name: 'My Popkins' });
    this.photo = page.getByRole('button', { name: 'Change your photo' });
    this.picker = page.locator('.photo-picker');
    this.photoPreview = this.photo.locator('img');
    this.initials = this.photo.locator('.avatar');
    this.photoError = page.locator('.photo-picker__error');
    this.name = page.getByRole('textbox', { name: 'Your name' });
    this.nameHint = page.locator('#name-hint');
    this.nameError = page.locator('#name-err');
    this.contact = page.getByRole('textbox', { name: /^(Phone number|Email)$/ });
    this.contactHint = page.getByText('You sign in with this. It’s never shown to other members.');
    this.fields = page.locator('.field');
    this.theme = page.getByRole('radiogroup', { name: 'Theme' });
    this.segmented = page.locator('.segmented');
    this.themeLabel = page.locator('.field__label', { hasText: /^Theme$/ });
    this.save = page.getByRole('button', { name: 'Save changes' });
    this.saving = page.getByRole('button', { name: 'Saving…' });
    this.saved = page.getByRole('status').filter({ hasText: 'Saved just now' });
    this.summary = page.locator('.form-summary');
    this.failed = page.getByRole('main').locator('.alert');
    this.menu = page.locator('.menu-list');
    this.signOut = this.menu.getByRole('button', { name: 'Sign out' });
    this.signOutRow = this.menu.locator('.menu-list__item', { hasText: 'Sign out' });
    this.deleteAccount = this.menu.getByRole('button', { name: 'Delete my account' });
    this.loading = page.getByRole('status').filter({ hasText: 'Loading your account…' });
    this.skeleton = page.locator('.skeleton').first().locator('..');
    this.empty = page.locator('.empty');
    this.error = page.getByRole('heading', { name: 'We couldn’t load your account' });
    this.tryAgain = page.getByRole('button', { name: 'Try again' });
    this.myPopkins = this.empty.getByRole('link', { name: 'My Popkins' });
    this.file = page.locator('input[type="file"]');
  }

  /** One choice of the theme: "Match my device", "Light" or "Dark". */
  themeOption(name: string): Locator {
    return this.theme.getByRole('radio', { name });
  }

  /** The theme the page is drawn in: the `data-theme` of `html`, or null when it follows the device. */
  async drawnTheme(): Promise<string | null> {
    return this.page.locator('html').getAttribute('data-theme');
  }

  /** Chooses a photo as the device's file picker would hand it over. */
  async choosePhoto(file: string | { name: string; mimeType: string; buffer: Buffer }) {
    await this.file.setInputFiles(file);
  }
}
