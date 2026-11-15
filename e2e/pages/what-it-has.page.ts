import type { Locator, Page } from '@playwright/test';

/** What should it have?, `/new/features` (L2-152). */
export class WhatItHasPage {
  readonly root: Locator;
  readonly heading: Locator;
  readonly lead: Locator;
  readonly steps: Locator;
  readonly switches: Locator;
  readonly popItUp: Locator;
  readonly alert: Locator;
  readonly back: Locator;
  /** Regions for the sweeps and the parity specs. */
  readonly rows: Locator;
  readonly footerButton: Locator;
  /** The picture half of the split screen, from 768 px (L2-058 AC10). */
  readonly picture: Locator;

  constructor(private readonly page: Page) {
    this.root = page.locator('body[data-page="what-it-has"]');
    this.heading = page.getByRole('heading', { level: 1 });
    this.lead = page.locator('main h1 + p');
    this.steps = page.locator('.step-dots');
    this.switches = page.getByRole('switch');
    this.popItUp = page.getByRole('button', { name: /Pop it up|Popping it up/ });
    this.alert = page.locator('.alert');
    this.back = page.getByRole('link', { name: 'Back' });
    this.rows = page.locator('.setting-row');
    this.footerButton = page.locator('.screen__footer .btn');
    this.picture = page.getByRole('complementary', { name: 'What happens' });
  }

  /** The switch of one feature, named by the feature: "Plan", "Schedules". */
  feature(name: string): Locator {
    return this.page.getByRole('switch', { name, exact: true });
  }

  /** The row of one feature, with its sentence. */
  row(name: string): Locator {
    return this.rows.filter({ hasText: name });
  }
}
