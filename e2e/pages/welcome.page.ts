import type { Locator, Page } from '@playwright/test';

/** The welcome screen, `/welcome` (L2-002, L2-007 AC3). */
export class WelcomePage {
  readonly root: Locator;
  readonly heading: Locator;
  readonly lead: Locator;
  readonly start: Locator;
  readonly joinWithCode: Locator;
  readonly signIn: Locator;
  /** The brand side of the split screen, from 768 px (L2-058 AC10). It is the aside only. */
  readonly aside: Locator;
  /** Regions for the sweeps and the parity specs. */
  readonly screen: Locator;
  readonly welcome: Locator;
  readonly wordmark: Locator;
  /** The mark as a picture: in the column below 768 px, in the aside from there. */
  readonly picture: Locator;
  readonly asidePicture: Locator;
  readonly actions: Locator;

  constructor(page: Page) {
    this.root = page.locator('body[data-page="welcome"]');
    this.heading = page.getByRole('heading', { level: 1 });
    this.lead = page.locator('.welcome__lead');
    this.start = page.getByRole('link', { name: 'Start a Popkin' });
    this.joinWithCode = page.getByRole('link', { name: 'Join with a code' });
    this.signIn = page.getByRole('link', { name: 'Already have an account? Sign in' });
    this.aside = page.getByRole('complementary', { name: 'Popkin' });
    this.screen = page.locator('.screen');
    this.welcome = page.locator('.welcome');
    this.wordmark = this.welcome.locator('.wordmark');
    this.picture = this.welcome.locator('.welcome__picture');
    this.asidePicture = this.aside.getByRole('img');
    this.actions = this.welcome.locator('.action-pair');
  }

  /** True when the two actions sit on one line, as they do from 1280 px (L2-058). */
  async actionsSideBySide(): Promise<boolean> {
    const first = await this.start.boundingBox();
    const second = await this.joinWithCode.boundingBox();
    return !!first && !!second && Math.abs(first.y - second.y) < 1;
  }
}
