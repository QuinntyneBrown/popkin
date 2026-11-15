import type { Locator, Page } from '@playwright/test';

/** "My hours" (L2-074 AC8): the member's working hours for the seven days of this week. */
export class MyHoursDialog {
  readonly root: Locator;
  readonly panel: Locator;
  readonly heading: Locator;
  readonly description: Locator;
  readonly close: Locator;
  readonly body: Locator;
  readonly footer: Locator;
  /** Each stretch's row: the day, its start and its end. */
  readonly rows: Locator;
  readonly days: Locator;
  readonly errors: Locator;
  /** "Save", or "Saving…" while it goes. */
  readonly save: Locator;
  readonly alert: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('dialog', { name: 'My hours' });
    this.panel = this.root.locator('.dialog__panel');
    this.heading = this.root.getByRole('heading', { level: 2 });
    this.description = this.root.locator('.dialog__desc');
    this.close = this.root.getByRole('button', { name: 'Close' });
    this.body = this.root.locator('.dialog__body');
    this.footer = this.root.locator('.dialog__footer');
    this.rows = this.root.locator('.hours-row');
    this.days = this.root.locator('.hours-row__day');
    this.errors = this.root.locator('.field__error');
    this.save = this.footer.getByRole('button', { name: /^(Save|Saving…)$/ });
    this.alert = this.root.locator('.alert');
  }

  /** A day's field: "Thursday start", or with `second`, "Thursday second end". */
  field(weekday: string, part: 'start' | 'end', second = false): Locator {
    return this.root.getByLabel(`${weekday}${second ? ' second' : ''} ${part}`, { exact: true });
  }

  /** "Add another" under a filled day. */
  addAnother(weekday: string): Locator {
    return this.root
      .locator('[pk-hours-row]')
      .filter({ has: this.root.page().getByLabel(`${weekday} start`, { exact: true }) })
      .getByRole('button', { name: 'Add another' });
  }
}
