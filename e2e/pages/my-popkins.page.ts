import type { Locator, Page } from '@playwright/test';

/** One active Popkin's card on My Popkins. */
export class PopkinCard {
  readonly name: Locator;
  readonly latest: Locator;
  /** The badge, whose accessible name says what it counts; `badgeCount` is what it shows. */
  readonly badge: Locator;
  readonly badgeCount: Locator;
  readonly more: Locator;
  readonly members: Locator;
  readonly foot: Locator;
  readonly tile: Locator;
  readonly avatars: Locator;

  constructor(readonly root: Locator) {
    this.name = root.locator('.popkin-card__name');
    this.latest = root.locator('.popkin-card__last');
    this.badge = root.locator('.badge');
    this.badgeCount = this.badge.locator('[aria-hidden="true"]');
    this.more = root.locator('.avatar-stack__more');
    this.members = root.locator('.popkin-card__foot .visually-hidden');
    this.foot = root.locator('.popkin-card__foot');
    this.tile = root.locator('.popkin-tile');
    this.avatars = root.locator('.avatar');
  }
}

/** My Popkins, `/popkins` (L2-017, L2-018). */
export class MyPopkinsPage {
  readonly root: Locator;
  readonly heading: Locator;
  readonly cards: Locator;
  readonly cardNames: Locator;
  readonly newPopkin: Locator;
  readonly scanToJoin: Locator;
  readonly account: Locator;
  readonly wrappedUpHeading: Locator;
  readonly wrappedUp: Locator;
  readonly loading: Locator;
  readonly skeletons: Locator;
  readonly list: Locator;
  readonly empty: Locator;
  readonly startAPopkin: Locator;
  readonly emptyScanToJoin: Locator;
  readonly error: Locator;
  readonly tryAgain: Locator;
  readonly offlineBanner: Locator;
  /** Regions for the sweeps and the parity specs. */
  readonly topBar: Locator;
  readonly grid: Locator;
  readonly wrappedUpList: Locator;
  readonly fab: Locator;
  readonly emptyState: Locator;
  readonly headerNewPopkin: Locator;
  readonly skeletonCards: Locator;

  constructor(private readonly page: Page) {
    this.root = page.locator('body[data-page="my-popkins"]');
    this.heading = page.getByRole('heading', { level: 1 });
    this.cards = page.locator('.popkin-card');
    this.cardNames = page.locator('.popkin-card__name');
    // One of the two shows: the header's button from 768 px, the floating one on a phone.
    this.newPopkin = page.getByRole('link', { name: 'New Popkin' }).locator('visible=true');
    this.scanToJoin = page.locator('.topbar').getByRole('button', { name: 'Scan to join' });
    this.account = page.getByRole('link', { name: /^Your account/ });
    this.wrappedUpHeading = page.getByRole('heading', { name: 'Wrapped up' });
    this.wrappedUp = page.locator('.divided .row');
    this.loading = page.getByRole('status').filter({ hasText: 'Loading your Popkins…' });
    this.skeletons = page.locator('.skeleton');
    this.list = page.locator('.popkin-grid');
    this.empty = page.locator('.empty');
    this.startAPopkin = page.getByRole('link', { name: 'Start a Popkin' });
    this.emptyScanToJoin = page.locator('.empty').getByRole('button', { name: 'Scan to join' });
    this.error = page.getByRole('alert').filter({ hasText: 'We couldn’t load your Popkins' });
    this.tryAgain = page.getByRole('button', { name: 'Try again' });
    this.offlineBanner = page.locator('.banner');
    this.topBar = page.locator('.topbar');
    this.grid = page.locator('.popkin-grid');
    this.wrappedUpList = page.locator('.divided');
    this.fab = page.locator('.fab');
    this.emptyState = page.locator('.empty');
    this.headerNewPopkin = page.locator('.topbar').getByRole('link', { name: 'New Popkin' });
    this.skeletonCards = page
      .locator('main [aria-hidden="true"]')
      .filter({ has: page.locator('.skeleton') })
      .first();
  }

  async open(): Promise<void> {
    await this.page.goto('/popkins');
    await this.root.waitFor();
  }

  card(name: string): PopkinCard {
    return new PopkinCard(this.cards.filter({ hasText: name }));
  }

  /** How many cards sit side by side in the first row. */
  async across(): Promise<number> {
    const tops = await this.cards.evaluateAll((cards) =>
      cards.map((card) => Math.round(card.getBoundingClientRect().top)),
    );
    return tops.filter((top) => top === tops[0]).length;
  }

  /** How many wrapped-up Popkins sit side by side in the first row. */
  async wrappedUpAcross(): Promise<number> {
    const tops = await this.wrappedUp.evaluateAll((rows) =>
      rows.map((row) => Math.round(row.getBoundingClientRect().top)),
    );
    return tops.filter((top) => top === tops[0]).length;
  }

  /** Nothing is wider than the screen, so the page never scrolls sideways. */
  fitsTheScreen(): Promise<boolean> {
    return this.page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    );
  }

  wrappedUpRow(name: string): Locator {
    return this.wrappedUp.filter({ hasText: name });
  }
}
