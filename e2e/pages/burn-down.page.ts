import type { Locator, Page } from '@playwright/test';

/** One of "Biggest open": its points, its title and its owner. */
export interface BiggestItem {
  root: Locator;
  points: Locator;
  title: Locator;
  owner: Locator;
}

/** The burn-down, the second view of the Plan tab, `/p/:popkinId/plan/burn-down` (L2-071). */
export class BurnDownPage {
  readonly root: Locator;
  readonly header: Locator;
  readonly heading: Locator;
  /** The sprint's days: "Aug 30 – Sep 26". */
  readonly sub: Locator;
  readonly currentView: Locator;
  readonly boardView: Locator;
  /** The chart and "Biggest open", beside or under it (L2-071 AC7). */
  readonly burn: Locator;
  /** "24 pts left" or "All done". */
  readonly headline: Locator;
  /** "7 behind", "3 ahead" or "On track". */
  readonly badge: Locator;
  /** "Finishes Sep 30 · 4 days late". */
  readonly forecast: Locator;
  /** The chart, named "Points left by day", and its text for assistive technology (L2-071 AC5). */
  readonly chart: Locator;
  readonly chartText: Locator;
  readonly todayLabel: Locator;
  readonly afterLabel: Locator;
  readonly legend: Locator;
  readonly legendKeys: Locator;
  readonly xLabels: Locator;
  /** "Biggest open" (L2-071 AC6), its stories and its line when nothing is open. */
  readonly biggest: Locator;
  readonly biggestList: Locator;
  readonly biggestItems: Locator;
  readonly biggestEmpty: Locator;
  /** "Nothing to burn down yet" and its "New story" (L2-071 AC8). */
  readonly empty: Locator;
  readonly newStory: Locator;
  readonly loading: Locator;
  readonly error: Locator;
  readonly tryAgain: Locator;
  readonly off: Locator;
  readonly backToPopkin: Locator;
  readonly nav: Locator;
  readonly currentTab: Locator;

  constructor(readonly page: Page) {
    this.root = page.locator('body[data-page="burn-down"]');
    this.header = page.locator('header.plan-header');
    this.heading = page.getByRole('heading', { level: 1, name: 'Burn-down' });
    this.sub = this.header.locator('.plan-header__sub');
    const views = page.getByRole('navigation', { name: 'Views' });
    this.currentView = views.locator('[aria-current="page"]');
    this.boardView = views.getByRole('link', { name: 'Board' });
    this.burn = page.locator('.burn');
    this.headline = this.burn.locator('.burn__headline strong');
    this.badge = this.burn.locator('.burn__badge');
    this.forecast = this.burn.locator('.burn__forecast');
    this.chart = page.getByRole('figure', { name: 'Points left by day' });
    this.chartText = this.chart.locator('p.visually-hidden');
    this.todayLabel = this.chart.locator('.burn-chart__label');
    this.afterLabel = this.chart.locator('.burn-chart__after-label');
    this.legend = this.chart.locator('.chart-legend');
    this.legendKeys = this.legend.locator('span');
    this.xLabels = this.chart.locator('.burn-chart__x span');
    this.biggest = page.locator('aside.biggest');
    this.biggestList = this.biggest.locator('ol');
    this.biggestItems = this.biggestList.locator('li');
    this.biggestEmpty = this.biggest.locator('p');
    this.empty = page.locator('.empty').filter({
      has: page.getByRole('heading', { name: 'Nothing to burn down yet' }),
    });
    this.newStory = this.empty.getByRole('button', { name: 'New story' });
    this.loading = page.getByRole('status').filter({ hasText: 'Loading the burn-down…' });
    this.error = page.getByRole('alert').filter({ hasText: 'We couldn’t load the burn-down' });
    this.tryAgain = this.error.getByRole('button', { name: 'Try again' });
    this.off = page.locator('.empty').filter({
      has: page.getByRole('heading', { name: 'Plan is switched off' }),
    });
    this.backToPopkin = this.off.getByRole('link', { name: /^Back to / });
    this.nav = page.getByRole('navigation', { name: 'Popkin' });
    this.currentTab = this.nav.locator('ul a[aria-current="page"]');
  }

  /** One of "Biggest open", in the order it lists them. */
  biggestItem(n: number): BiggestItem {
    const root = this.biggestItems.nth(n);
    return {
      root,
      points: root.locator('.biggest__pts'),
      title: root.locator('.biggest__title'),
      owner: root.getByRole('img'),
    };
  }
}
