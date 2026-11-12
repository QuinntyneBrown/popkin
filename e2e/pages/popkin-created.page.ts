import type { Locator, Page } from '@playwright/test';

/** The created screen, `/p/:popkin/created` (L2-010, L2-011 AC6). */
export class PopkinCreatedPage {
  readonly root: Locator;
  readonly heading: Locator;
  readonly tile: Locator;
  readonly confetti: Locator;
  readonly qr: Locator;
  readonly link: Locator;
  readonly copyLink: Locator;
  readonly textIt: Locator;
  readonly share: Locator;
  readonly status: Locator;
  readonly goTo: Locator;
  readonly screen: Locator;
  /** Regions for the sweeps and the parity specs. */
  readonly shareActions: Locator;
  readonly footerButton: Locator;
  readonly pop: Locator;
  readonly textItRegion: Locator;

  constructor(page: Page) {
    this.root = page.locator('body[data-page="popkin-created"]');
    this.heading = page.getByRole('heading', { level: 1 });
    this.tile = page.locator('.pop .popkin-tile');
    this.confetti = page.locator('.pop__dot');
    this.qr = page.locator('svg.qr');
    this.link = page.locator('.qr-card__link');
    this.copyLink = page.getByRole('button', { name: /Copy link|Copied/ });
    this.textIt = page.getByRole('link', { name: 'Text it' });
    this.share = page.getByRole('button', { name: 'Share' });
    this.status = page.locator('main [role="status"]');
    this.goTo = page.getByRole('link', { name: /^Go to / });
    this.screen = page.locator('.screen');
    this.shareActions = page.locator('.share-actions');
    this.footerButton = page.locator('.screen__footer .btn');
    this.pop = page.locator('.pop');
    this.textItRegion = page.locator('.share-action').nth(1);
  }
}
