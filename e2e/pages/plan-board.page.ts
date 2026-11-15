import type { Locator, Page } from '@playwright/test';

/** The plan board, the first view of the Plan tab, `/p/:popkinId/plan` (L2-068). */
export class PlanBoardPage {
  readonly root: Locator;
  /** "Plan is switched off" (L2-077 AC2), and its way back to the Popkin's home. */
  readonly off: Locator;
  readonly offText: Locator;
  readonly backToPopkin: Locator;
  readonly nav: Locator;
  readonly tabs: Locator;
  readonly currentTab: Locator;

  constructor(readonly page: Page) {
    this.root = page.locator('body[data-page="plan-board"]');
    this.off = page.locator('.empty').filter({
      has: page.getByRole('heading', { name: 'Plan is switched off' }),
    });
    this.offText = this.off.locator('p');
    this.backToPopkin = this.off.getByRole('link', { name: /^Back to / });
    this.nav = page.getByRole('navigation', { name: 'Popkin' });
    this.tabs = this.nav.locator('ul a > span:not(.badge)');
    this.currentTab = this.nav.locator('ul a[aria-current="page"]');
  }
}
