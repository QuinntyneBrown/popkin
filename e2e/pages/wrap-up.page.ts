import type { Locator, Page } from '@playwright/test';

/** Wrap up (L2-043): the Host is asked to confirm, and chooses whether the album is kept. */
export class WrapUpPage {
  readonly root: Locator;
  readonly screen: Locator;
  readonly topBar: Locator;
  readonly back: Locator;
  readonly main: Locator;
  readonly tile: Locator;
  readonly heading: Locator;
  readonly lead: Locator;
  /** "We couldn't wrap it up." */
  readonly alert: Locator;
  readonly facts: Locator;
  readonly factRows: Locator;
  /** "Keep the photo album", with the line that says what the choice does. */
  readonly keepRow: Locator;
  readonly keepAlbum: Locator;
  readonly keepLine: Locator;
  /** "Wrap it up"; "Wrapping up…" while it is sent. */
  readonly wrapItUp: Locator;
  readonly notYet: Locator;
  /** From 768 px: the recap that wrapping up will make. */
  readonly picture: Locator;

  constructor(page: Page) {
    this.root = page.locator('body[data-page="wrap-up"]');
    this.screen = page.locator('.screen');
    this.topBar = this.screen.locator('.topbar');
    this.back = this.topBar.getByRole('link', { name: 'Back' });
    this.main = page.locator('main');
    this.tile = this.main.locator('.popkin-tile').first();
    this.heading = page.getByRole('heading', { level: 1 });
    this.lead = this.main.locator('h1 + p');
    this.alert = this.main.getByRole('alert');
    this.facts = this.main.locator('.facts');
    this.factRows = this.facts.locator('.fact');
    this.keepRow = this.main.locator('.setting-row');
    this.keepAlbum = page.getByRole('switch', { name: 'Keep the photo album' });
    this.keepLine = this.keepRow.locator('.setting-row__sub');
    this.wrapItUp = this.main.locator('.btn--primary');
    this.notYet = this.main.getByRole('link', { name: 'Not yet' });
    this.picture = page.locator('.split-aside');
  }
}
