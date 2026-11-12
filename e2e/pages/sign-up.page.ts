import type { Locator, Page } from '@playwright/test';

/** The sign-up screen, `/sign-up` (L2-003). */
export class SignUpPage {
  readonly root: Locator;
  readonly heading: Locator;
  readonly name: Locator;
  readonly phone: Locator;
  readonly email: Locator;
  readonly phoneTab: Locator;
  readonly emailTab: Locator;
  readonly continue: Locator;
  readonly summary: Locator;
  readonly nameError: Locator;
  readonly contactError: Locator;
  readonly alert: Locator;
  readonly terms: Locator;
  readonly privacy: Locator;
  /** Regions for the sweeps and the parity specs. */
  readonly topBar: Locator;
  readonly back: Locator;
  readonly stepDots: Locator;
  readonly nameField: Locator;
  readonly contactHint: Locator;
  readonly segmented: Locator;
  readonly legal: Locator;
  readonly primaryButton: Locator;

  constructor(private readonly page: Page) {
    this.root = page.locator('body[data-page="sign-up"]');
    this.heading = page.getByRole('heading', { level: 1 });
    this.name = page.getByLabel('Your name');
    this.phone = page.getByRole('textbox', { name: 'Phone number' });
    this.email = page.getByRole('textbox', { name: 'Email' });
    this.phoneTab = page.getByRole('tab', { name: 'Phone' });
    this.emailTab = page.getByRole('tab', { name: 'Email' });
    this.continue = page.getByRole('button', { name: /Continue|Sending your code/ });
    this.summary = page.locator('.form-summary');
    this.nameError = page.locator('#name-err');
    this.contactError = page.locator('#contact-err');
    this.alert = page.locator('.alert');
    this.terms = page.getByRole('link', { name: 'Terms' });
    this.privacy = page.getByRole('link', { name: 'Privacy' });
    this.topBar = page.locator('.topbar');
    this.back = page.getByRole('link', { name: 'Back' });
    this.stepDots = page.locator('.step-dots');
    this.nameField = page.locator('.field').filter({ has: page.locator('#name') });
    this.contactHint = page.locator('#contact-hint');
    this.segmented = page.locator('.segmented');
    this.legal = page.locator('.legal');
    this.primaryButton = page.locator('.btn--primary');
  }

  async fill(name: string, contact: string, channel: 'phone' | 'email' = 'phone'): Promise<void> {
    if (channel === 'email') await this.emailTab.click();
    await this.name.fill(name);
    await (channel === 'email' ? this.email : this.phone).fill(contact);
  }

  async submit(): Promise<void> {
    await this.continue.click();
  }
}
