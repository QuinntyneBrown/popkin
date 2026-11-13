import type { Locator, Page } from '@playwright/test';

/** The not-found screen (L2-056 AC5): an address that matches no screen. */
export class NotFoundPage {
  readonly root: Locator;
  readonly heading: Locator;
  readonly myPopkins: Locator;
  readonly landing: Locator;
  readonly skipLink: Locator;
  readonly main: Locator;
  /** Regions for the sweeps and the parity specs. */
  readonly topBar: Locator;
  readonly logo: Locator;
  readonly emptyState: Locator;
  readonly emptyIcon: Locator;
  readonly mark: Locator;
  readonly screen: Locator;
  readonly primaryButton: Locator;
  readonly secondaryButton: Locator;

  constructor(page: Page) {
    this.root = page.locator('body[data-page="not-found"]');
    this.heading = page.getByRole('heading', { level: 1 });
    this.myPopkins = page.getByRole('link', { name: 'My Popkins' });
    this.landing = page.getByRole('link', { name: 'Popkin home page' });
    this.skipLink = page.getByRole('link', { name: 'Skip to content' });
    this.main = page.getByRole('main');
    this.topBar = page.locator('.topbar');
    this.logo = page.locator('.logo');
    this.emptyState = page.locator('.empty');
    this.emptyIcon = page.locator('.empty__icon');
    this.mark = page.locator('.logo .mark');
    this.screen = page.locator('.screen');
    this.primaryButton = page.locator('.empty .btn--primary');
    this.secondaryButton = page.locator('.empty .btn--secondary');
  }
}
