import type { Locator, Page } from '@playwright/test';

/** Admin sign in (L2-088): a staff email, then the six-digit code sent to it. */
export class AdminSignInPage {
  readonly root: Locator;
  readonly heading: Locator;
  readonly lead: Locator;
  readonly email: Locator;
  readonly emailError: Locator;
  readonly sendCode: Locator;
  readonly code: Locator;
  readonly codeError: Locator;
  readonly signIn: Locator;
  readonly useAnotherEmail: Locator;
  readonly sendNewCode: Locator;
  readonly alert: Locator;
  /** Regions for the sweeps and the parity specs. */
  readonly entry: Locator;
  readonly card: Locator;
  readonly brand: Locator;

  constructor(page: Page) {
    this.root = page.locator('body[data-page="sign-in"]');
    this.heading = page.getByRole('heading', { level: 1 });
    this.lead = page.locator('.admin-entry__lead');
    this.email = page.getByLabel('Staff email');
    this.emailError = page.locator('#email-err');
    this.sendCode = page.getByRole('button', { name: /Email me a code|Sending code/ });
    this.code = page.getByLabel('Six-digit code');
    this.codeError = page.locator('#code-err');
    this.signIn = page.getByRole('button', { name: /Sign in|Checking/ });
    this.useAnotherEmail = page.getByRole('button', { name: 'Use another email' });
    this.sendNewCode = page.getByRole('button', { name: /Send a new code/ });
    this.alert = page.locator('.alert');
    this.entry = page.locator('.admin-entry');
    this.card = page.locator('.admin-entry__card');
    this.brand = page.locator('.admin-entry__brand');
  }
}
