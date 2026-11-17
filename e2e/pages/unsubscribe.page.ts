import type { Locator, Page } from '@playwright/test';

/** The page "Unsubscribe from all email" opens, `/unsubscribe?t=…`, with no session (L2-168). */
export class UnsubscribePage {
  readonly root: Locator;
  readonly heading: Locator;
  readonly text: Locator;
  readonly turnEmailBackOn: Locator;
  readonly signIn: Locator;
  readonly tryAgain: Locator;
  readonly working: Locator;
  /** Regions for the sweeps and the parity specs. */
  readonly topBar: Locator;
  readonly emptyState: Locator;
  readonly skeleton: Locator;

  constructor(private readonly page: Page) {
    this.root = page.locator('body[data-page="unsubscribe"]');
    this.heading = page.getByRole('heading', { level: 1 });
    this.text = page.locator('.empty p');
    this.turnEmailBackOn = page.getByRole('link', { name: 'Turn email back on' });
    this.signIn = page.getByRole('link', { name: 'Sign in' });
    this.tryAgain = page.getByRole('button', { name: 'Try again' });
    this.working = page.getByRole('status').filter({ hasText: 'Unsubscribing you…' });
    this.topBar = page.locator('.topbar');
    this.emptyState = page.locator('.empty');
    this.skeleton = page.locator('.skeleton').first();
  }

  async open(token: string): Promise<void> {
    await this.page.goto(`/unsubscribe?t=${token}`);
  }
}
