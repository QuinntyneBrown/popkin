import type { Locator, Page } from '@playwright/test';

/** Experiences, what the group did and wants to do, `/p/:popkinId/experiences` (L2-037). */
export class ExperiencesPage {
  readonly root: Locator;
  readonly screen: Locator;
  readonly header: Locator;
  readonly heading: Locator;
  readonly intro: Locator;
  readonly filters: Locator;
  readonly all: Locator;
  readonly weDid: Locator;
  readonly wantToDo: Locator;
  /** "Share one" in the header, from 768 px. */
  readonly shareInHeader: Locator;
  /** "Share one", the floating action of a phone. */
  readonly shareFloating: Locator;
  /** "Share one" wherever this width shows it: in the header or floating. */
  readonly shareOne: Locator;
  /** "Share one" of the empty list and of a filter with none. */
  readonly shareFirst: Locator;
  readonly showAll: Locator;
  readonly grid: Locator;
  readonly cards: Locator;
  readonly titles: Locator;
  readonly loading: Locator;
  readonly skeletons: Locator;
  readonly empty: Locator;
  readonly emptyHeading: Locator;
  readonly error: Locator;
  readonly tryAgain: Locator;
  readonly nav: Locator;
  readonly currentTab: Locator;
  /** Regions for the sweeps and the parity specs. */
  readonly body: Locator;
  readonly fab: Locator;
  readonly headerAction: Locator;
  readonly listSkeleton: Locator;
  readonly firstChip: Locator;

  constructor(page: Page) {
    this.root = page.locator('body[data-page="experiences"]');
    this.screen = page.locator('.screen');
    this.header = page.locator('.tab-header');
    this.heading = this.header.getByRole('heading', { level: 1 });
    this.intro = this.header.getByText('What we did, and what we want to do next.');
    this.filters = this.header.getByRole('group', { name: 'Filter' });
    this.all = this.filters.getByRole('button', { name: 'All', exact: true });
    this.weDid = this.filters.getByRole('button', { name: 'We did' });
    this.wantToDo = this.filters.getByRole('button', { name: 'Want to do' });
    this.firstChip = this.filters.locator('.chip').first();
    this.headerAction = this.header.locator('.tab-header__action');
    this.shareInHeader = this.headerAction;
    this.fab = page.locator('.fab');
    this.shareFloating = this.fab;
    this.shareOne = page.locator('.tab-header__action:visible, .fab:visible');
    this.body = page.locator('#main');
    this.grid = this.body.locator('.exp-grid');
    this.cards = this.grid.locator('.exp-card');
    this.titles = this.grid.locator('.exp-card__title');
    this.loading = this.body.getByRole('status');
    this.listSkeleton = this.body.locator('[aria-hidden="true"]').first();
    this.skeletons = this.body.locator('.skeleton');
    this.empty = this.body.locator('.empty');
    this.emptyHeading = this.empty.getByRole('heading');
    this.shareFirst = this.empty.locator('.btn', { hasText: 'Share one' });
    this.showAll = this.empty.locator('.btn', { hasText: 'Show all' });
    this.error = this.body.getByRole('alert');
    this.tryAgain = this.error.locator('.btn', { hasText: 'Try again' });
    this.nav = page.getByRole('navigation', { name: 'Popkin' });
    this.currentTab = this.nav.locator('[aria-current="page"]');
  }

  /** The card of an experience, the whole of it one link, by its title. */
  card(title: string): Locator {
    return this.cards.filter({ hasText: title });
  }

  /** The picture of a card, or the Popkin's emoji in its place. */
  mediaOf(title: string): Locator {
    return this.card(title).locator('.exp-card__media');
  }

  /** The kind of an experience, on the tag over its picture. */
  kindOf(title: string): Locator {
    return this.card(title).locator('.tag');
  }

  /** Who shared an experience and when: "Mara · Sat morning". */
  byOf(title: string): Locator {
    return this.card(title).locator('.exp-card__by');
  }

  /** The average and the number of ratings of an experience: "4.7 (11)". */
  ratingOf(title: string): Locator {
    return this.card(title).locator('.rating');
  }

  /** The end of a card's foot: its rating, or how many are keen. */
  footOf(title: string): Locator {
    return this.card(title).locator('.exp-card__foot');
  }

  /** How many cards sit side by side in the first row. */
  async across(): Promise<number> {
    const tops = await this.cards.evaluateAll((cards) =>
      cards.map((card) => Math.round(card.getBoundingClientRect().top)),
    );
    return tops.filter((top) => top === tops[0]).length;
  }
}
