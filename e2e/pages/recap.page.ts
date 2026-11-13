import type { Locator, Page } from '@playwright/test';

/** The recap (L2-046): the front page of a Popkin that has wrapped up. */
export class RecapPage {
  readonly root: Locator;
  readonly screen: Locator;
  readonly topBar: Locator;
  readonly myPopkins: Locator;
  readonly main: Locator;
  readonly recap: Locator;
  /** The collage with the headline; beside the rest from 1024 px. */
  readonly lead: Locator;
  readonly rest: Locator;
  readonly collage: Locator;
  readonly prints: Locator;
  readonly heading: Locator;
  /** The Popkin's name and dates. */
  readonly line: Locator;
  readonly card: Locator;
  /** "14 people showed up", with their faces. */
  readonly people: Locator;
  readonly stats: Locator;
  readonly statValues: Locator;
  readonly firstStat: Locator;
  /** The top-rated moment; absent when nothing was rated. */
  readonly moment: Locator;
  readonly momentLink: Locator;
  readonly actions: Locator;
  readonly saveTheAlbum: Locator;
  /** The same button while the album is prepared. */
  readonly preparing: Locator;
  /** The album being prepared: "Preparing 12 of 48". */
  readonly progress: Locator;
  readonly progressText: Locator;
  readonly popUpAnother: Locator;
  readonly startYourOwn: Locator;
  readonly readTheChat: Locator;
  /** "Photos go in 12 days." */
  readonly photosGo: Locator;
  readonly save: Locator;
  readonly loading: Locator;
  readonly skeletons: Locator;
  readonly error: Locator;
  readonly tryAgain: Locator;

  constructor(page: Page) {
    this.root = page.locator('body[data-page="wrapped-up"]');
    this.screen = page.locator('.screen');
    this.topBar = this.screen.locator('.topbar');
    this.myPopkins = this.topBar.getByRole('link', { name: 'My Popkins' });
    this.main = page.locator('main');
    this.recap = page.locator('.recap');
    this.lead = this.recap.locator('.recap__lead');
    this.rest = this.recap.locator('.recap__rest');
    this.collage = this.recap.locator('.polaroids');
    this.prints = this.collage.locator('img');
    this.heading = page.getByRole('heading', { level: 1 });
    this.line = this.recap.locator('.recap__headline p');
    this.card = this.recap.locator('.recap__card');
    this.people = this.recap.locator('.recap__people');
    this.stats = this.recap.locator('.stat-pair');
    this.statValues = this.stats.locator('.stat__value');
    this.firstStat = this.stats.locator('> div').first();
    this.moment = this.recap.locator('.recap__moment');
    // The card is the link.
    this.momentLink = this.moment;
    this.actions = this.recap.locator('.recap__actions');
    this.saveTheAlbum = this.actions.getByRole('button', { name: 'Save the album' });
    this.preparing = this.actions.getByRole('button', { name: 'Preparing the album…' });
    this.progress = this.actions.getByRole('progressbar');
    this.progressText = this.actions.getByText(/^Preparing \d/);
    this.popUpAnother = this.actions.getByRole('link', { name: 'Pop up another with this crew' });
    this.startYourOwn = this.actions.getByRole('link', { name: 'Start your own Popkin' });
    this.readTheChat = this.actions.getByRole('link', { name: 'Read the chat' });
    this.photosGo = page.locator('.banner--warning');
    this.save = this.photosGo.locator('.banner__action');
    this.loading = page.locator('.recap-skeleton').getByRole('status');
    this.skeletons = this.main
      .locator('[aria-hidden="true"]')
      .filter({ has: page.locator('.skeleton') })
      .first();
    this.error = this.main.locator('.empty');
    this.tryAgain = this.error.locator('.btn--primary');
  }

  /** Whether the collage sits beside the numbers and actions, as it does from 1024 px. */
  async sideBySide(): Promise<boolean> {
    const lead = await this.lead.boundingBox();
    const rest = await this.rest.boundingBox();
    return !!lead && !!rest && rest.x >= lead.x + lead.width - 1;
  }
}
