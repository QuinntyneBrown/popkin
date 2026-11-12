import type { Locator, Page } from '@playwright/test';

/** How long should it last?, `/new/length` (L2-009). */
export class HowLongPage {
  readonly root: Locator;
  readonly heading: Locator;
  readonly lead: Locator;
  readonly group: Locator;
  readonly options: Locator;
  readonly endDate: Locator;
  readonly popItUp: Locator;
  readonly alert: Locator;
  readonly back: Locator;
  /** Regions for the sweeps and the parity specs. */
  readonly checkedCard: Locator;
  readonly firstCard: Locator;
  readonly dateButton: Locator;
  readonly footerButton: Locator;

  constructor(private readonly page: Page) {
    this.root = page.locator('body[data-page="how-long"]');
    this.heading = page.getByRole('heading', { level: 1 });
    this.lead = page.locator('main h1 + p');
    this.group = page.getByRole('radiogroup', { name: 'How long it lasts' });
    this.options = this.group.getByRole('radio');
    this.endDate = page.getByRole('button', { name: /^Ends / });
    this.popItUp = page.getByRole('button', { name: /Pop it up|Popping it up/ });
    this.alert = page.locator('.alert');
    this.back = page.getByRole('link', { name: 'Back' });
    this.checkedCard = page.locator('.option-card[aria-checked="true"]');
    this.firstCard = page.locator('.option-card').first();
    this.dateButton = page.locator('.date-btn');
    this.footerButton = page.locator('.screen__footer .btn');
  }

  option(name: string): Locator {
    return this.group.getByRole('radio', { name: new RegExp(`^${name}`) });
  }
}
