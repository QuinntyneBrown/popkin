import type { Locator, Page } from '@playwright/test';

/** One column of the board: its head and its stories. */
export interface BoardColumn {
  root: Locator;
  heading: Locator;
  count: Locator;
  points: Locator;
  hint: Locator;
  empty: Locator;
  cards: Locator;
  titles: Locator;
}

/** One story's card. */
export interface StoryCardRegion {
  root: Locator;
  title: Locator;
  tag: Locator;
  points: Locator;
  owner: Locator;
  due: Locator;
}

/** The plan board, the first view of the Plan tab, `/p/:popkinId/plan` (L2-068). */
export class PlanBoardPage {
  readonly root: Locator;
  readonly header: Locator;
  readonly heading: Locator;
  /** The line under the name: the sprint, its dates and the days left. */
  readonly sub: Locator;
  readonly views: Locator;
  readonly currentView: Locator;
  readonly burnDownView: Locator;
  readonly board: Locator;
  readonly columns: Locator;
  readonly columnHeadings: Locator;
  readonly cards: Locator;
  /** "New story" in the header, from 768 px (L2-068 AC8). */
  readonly newStory: Locator;
  /** The floating "New story" above the tabs, below 768 px. */
  readonly newStoryFab: Locator;
  /** "No stories yet" (L2-068 AC9), its text and its four starters. */
  readonly empty: Locator;
  readonly emptyText: Locator;
  readonly starters: Locator;
  /** "This Popkin has wrapped up." over the board of a wrapped-up Popkin (L2-070 AC7). */
  readonly wrappedUp: Locator;
  readonly loading: Locator;
  readonly error: Locator;
  readonly tryAgain: Locator;
  /** "Plan is switched off" (L2-077 AC2), and its way back to the Popkin's home. */
  readonly off: Locator;
  readonly offText: Locator;
  readonly backToPopkin: Locator;
  readonly nav: Locator;
  readonly tabs: Locator;
  readonly currentTab: Locator;

  constructor(readonly page: Page) {
    this.wrappedUp = page.getByRole('status').filter({ hasText: 'This Popkin has wrapped up.' });
    this.root = page.locator('body[data-page="plan-board"]');
    this.header = page.locator('header.plan-header');
    this.heading = page.getByRole('heading', { level: 1, name: 'Our plan' });
    this.sub = this.header.locator('.plan-header__sub');
    this.views = page.getByRole('navigation', { name: 'Views' }).getByRole('link');
    this.currentView = page
      .getByRole('navigation', { name: 'Views' })
      .locator('[aria-current="page"]');
    this.burnDownView = page.getByRole('navigation', { name: 'Views' }).getByRole('link', {
      name: 'Burn-down',
    });
    this.board = page.locator('.board');
    this.columns = this.board.locator('section.board__col');
    this.columnHeadings = this.columns.getByRole('heading', { level: 2 });
    this.cards = this.board.locator('.story-card');
    this.newStory = this.header.getByRole('button', { name: 'New story' });
    this.newStoryFab = page.locator('.screen__fab').getByRole('button', { name: 'New story' });
    this.empty = page.locator('.empty').filter({
      has: page.getByRole('heading', { name: 'No stories yet' }),
    });
    this.emptyText = this.empty.locator('p');
    this.starters = this.empty.getByRole('button');
    this.loading = page.getByRole('status').filter({ hasText: 'Loading the plan…' });
    this.error = page.getByRole('alert').filter({ hasText: 'We couldn’t load the plan' });
    this.tryAgain = this.error.getByRole('button', { name: 'Try again' });
    this.off = page.locator('.empty').filter({
      has: page.getByRole('heading', { name: 'Plan is switched off' }),
    });
    this.offText = this.off.locator('p');
    this.backToPopkin = this.off.getByRole('link', { name: /^Back to / });
    this.nav = page.getByRole('navigation', { name: 'Popkin' });
    this.tabs = this.nav.locator('ul a > span:not(.badge)');
    this.currentTab = this.nav.locator('ul a[aria-current="page"]');
  }

  /** A starter of the empty board: "Pick the dates" (L2-068 AC9). */
  starter(name: string): Locator {
    return this.starters.filter({ hasText: name });
  }

  /** A column, by its name: "To do". */
  column(name: string): BoardColumn {
    const root = this.page.getByRole('region', { name, exact: true });
    const cards = root.locator('.story-card');
    return {
      root,
      heading: root.getByRole('heading', { level: 2 }),
      count: root.locator('.board__count'),
      points: root.locator('.board__pts'),
      hint: root.locator('.board__hint'),
      empty: root.locator('.board__empty'),
      cards,
      titles: cards.locator('.story-card__title'),
    };
  }

  /** A story's card, by its title. */
  card(title: string): StoryCardRegion {
    const root = this.cards.filter({
      has: this.page.locator('.story-card__title', { hasText: title }),
    });
    return {
      root,
      title: root.locator('.story-card__title'),
      tag: root.locator('.story-card__tag'),
      points: root.locator('.story-card__pts'),
      owner: root.locator('.story-card__owner'),
      due: root.getByText(/^Due /),
    };
  }
}
