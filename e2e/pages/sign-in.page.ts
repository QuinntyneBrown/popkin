import type { Locator, Page } from '@playwright/test';

/** The sign-in screen, `/sign-in` (L2-006). */
export class SignInPage {
  readonly root: Locator;
  readonly heading: Locator;
  readonly lead: Locator;
  readonly contact: Locator;
  readonly contactHint: Locator;
  readonly contactError: Locator;
  readonly send: Locator;
  readonly startAPopkin: Locator;
  readonly back: Locator;
  readonly alert: Locator;
  /** The picture half of the split screen, from 768 px (L2-058 AC10). */
  readonly picture: Locator;
  /** Regions for the sweeps and the parity specs. */
  readonly topBar: Locator;
  readonly contactField: Locator;
  readonly primaryButton: Locator;
  readonly startAPopkinRegion: Locator;

  constructor(private readonly page: Page) {
    this.root = page.locator('body[data-page="sign-in"]');
    this.heading = page.getByRole('heading', { level: 1 });
    this.lead = page.locator('main p').first();
    this.contact = page.getByLabel('Phone number or email');
    this.contactHint = page.locator('#contact-hint');
    this.contactError = page.locator('#contact-err');
    this.send = page.getByRole('button', { name: /Send my code|Sending your code/ });
    this.startAPopkin = page.getByRole('link', { name: 'New here? Start a Popkin' });
    this.back = page.getByRole('link', { name: 'Back' });
    this.alert = page.locator('.alert');
    this.picture = page.getByRole('complementary', { name: 'Popkin' });
    this.topBar = page.locator('.topbar');
    this.contactField = page.locator('.field').filter({ has: page.locator('#contact') });
    this.primaryButton = page.locator('.btn--primary');
    this.startAPopkinRegion = page.locator('a.text-btn');
  }

  async open(returnUrl?: string): Promise<void> {
    await this.page.goto(
      returnUrl ? `/sign-in?returnUrl=${encodeURIComponent(returnUrl)}` : '/sign-in',
    );
    await this.root.waitFor();
  }

  /** Asks for a code, and answers with what the app sent for it. */
  async sendCodeTo(contact: string): Promise<unknown> {
    await this.contact.fill(contact);
    const [request] = await Promise.all([
      this.page.waitForRequest((r) => r.method() === 'POST' && r.url().endsWith('/api/auth/codes')),
      this.send.click(),
    ]);
    return request.postDataJSON();
  }
}
