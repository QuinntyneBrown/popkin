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
  }

  async open(): Promise<void> {
    await this.page.goto('/popkins');
    await this.root.waitFor();
  }

  card(name: string): PopkinCard {
    return new PopkinCard(this.cards.filter({ hasText: name }));
  }

  wrappedUpRow(name: string): Locator {
    return this.wrappedUp.filter({ hasText: name });
  }
}
