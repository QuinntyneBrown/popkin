import type { Locator, Page } from '@playwright/test';

/** The welcome after joining, `/i/:code/welcome` (L2-014). */
export class YoureInPage {
  readonly root: Locator;
  readonly heading: Locator;
  readonly line: Locator;
  readonly tile: Locator;
  readonly avatars: Locator;
  readonly confetti: Locator;
  readonly sayHi: Locator;
  readonly seeThePhotos: Locator;
  readonly screen: Locator;
  /** Regions for the sweeps and the parity specs. */
  readonly arrival: Locator;
  readonly circle: Locator;

  constructor(private readonly page: Page) {
    this.root = page.locator('body[data-page="youre-in"]');
    this.heading = page.getByRole('heading', { level: 1 });
    this.line = page.locator('.lead');
    this.circle = page.locator('.circle');
    this.tile = this.circle.locator('.popkin-tile');
    this.avatars = this.circle.locator('.avatar');
    this.confetti = page.locator('.pop__dot');
    this.sayHi = page.getByRole('link', { name: 'Say hi to everyone' });
    this.seeThePhotos = page.getByRole('link', { name: 'See the photos' });
    this.screen = page.locator('.screen');
    // The heading's parent holds the circle, the heading and the line, in the mock and the app.
    this.arrival = this.heading.locator('..');
  }

  /** True when the two actions sit on one line, as they do from 640 px (L2-058). */
  async actionsShareALine(): Promise<boolean> {
    const first = await this.sayHi.boundingBox();
    const second = await this.seeThePhotos.boundingBox();
    return !!first && !!second && Math.abs(first.y - second.y) < 1;
  }
}
