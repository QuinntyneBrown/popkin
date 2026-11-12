import type { Locator, Page } from '@playwright/test';
import { SignUpPage } from './sign-up.page';

/** The code screen, `/verify` (L2-004, L2-005). */
export class VerifyCodePage {
  readonly root: Locator;
  readonly heading: Locator;
  readonly sentTo: Locator;
  readonly code: Locator;
  readonly codeError: Locator;
  readonly confirm: Locator;
  readonly resend: Locator;
  readonly differentNumber: Locator;
  readonly toast: Locator;
  /** Regions for the sweeps and the parity specs. */
  readonly codeField: Locator;
  readonly primaryButton: Locator;
  readonly differentNumberRegion: Locator;
  readonly resendRegion: Locator;
  readonly toastIcon: Locator;
  readonly toastDismiss: Locator;

  constructor(private readonly page: Page) {
    this.root = page.locator('body[data-page="verify-code"]');
    this.heading = page.getByRole('heading', { level: 1 });
    this.sentTo = page.locator('main p').first();
    this.code = page.getByLabel('6-digit code');
    this.codeError = page.locator('#code-err');
    this.confirm = page.getByRole('button', { name: /Confirm|Checking/ });
    this.resend = page.getByRole('button', { name: /Send a new code/ });
    this.differentNumber = page.getByRole('link', { name: 'Use a different number' });
    this.toast = page.locator('.toast');
    this.codeField = page.locator('.field').filter({ has: page.locator('#code') });
    this.primaryButton = page.locator('.btn--primary');
    this.differentNumberRegion = page.locator('a.text-btn');
    this.resendRegion = page.locator('button.text-btn');
    this.toastIcon = page.locator('.toast > svg');
    this.toastDismiss = page.locator('.toast .icon-btn');
  }

  /** Signs up as Mara, the way the code screen is reached; the store lives in memory only. */
  async reach(returnUrl?: string): Promise<void> {
    const signUp = new SignUpPage(this.page);
    await this.page.goto(
      returnUrl ? `/sign-up?returnUrl=${encodeURIComponent(returnUrl)}` : '/sign-up',
    );
    await signUp.fill('Mara', '(415) 555-0148');
    await signUp.submit();
    await this.root.waitFor();
  }

  async type(code: string): Promise<void> {
    await this.code.pressSequentially(code);
  }
}
