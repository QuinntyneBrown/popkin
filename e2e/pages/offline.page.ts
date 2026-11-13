import type { Locator, Page } from '@playwright/test';

/** The offline screen, `/offline` (L2-056 AC4): a screen never loaded needs a connection. */
export class OfflinePage {
  readonly root: Locator;
  readonly heading: Locator;
  readonly text: Locator;
  readonly tryAgain: Locator;
  readonly myPopkins: Locator;
  readonly logo: Locator;
  /** Regions for the sweeps and the parity specs. */
  readonly emptyState: Locator;
  readonly icon: Locator;

  constructor(private readonly page: Page) {
    this.root = page.locator('body[data-page="offline"]');
    this.heading = page.getByRole('heading', { level: 1 });
    this.text = page.locator('.empty__text');
    this.tryAgain = page.getByRole('button', { name: 'Try again' });
    this.myPopkins = page.getByRole('link', { name: 'My Popkins' });
    this.logo = page.locator('a.logo');
    this.emptyState = page.locator('.empty');
    this.icon = page.locator('.empty__icon');
  }

  /** Takes the device's connection away, or gives it back. */
  async connection(online: boolean): Promise<void> {
    await this.page.context().setOffline(!online);
  }
}
