import type { Locator, Page } from '@playwright/test';

/** "Features" (L2-153): the Host switches the offered features on and off. */
export class PopkinFeaturesDialog {
  readonly root: Locator;
  readonly panel: Locator;
  readonly heading: Locator;
  readonly close: Locator;
  readonly body: Locator;
  readonly footer: Locator;
  readonly rows: Locator;
  readonly switches: Locator;
  /** "Save", or "Saving…" while it goes. */
  readonly save: Locator;
  readonly cancel: Locator;
  readonly alert: Locator;

  constructor(private readonly page: Page) {
    this.root = page.getByRole('dialog', { name: 'Features' });
    this.panel = this.root.locator('.dialog__panel');
    this.heading = this.root.getByRole('heading', { level: 2 });
    this.close = this.root.getByRole('button', { name: 'Close' });
    this.body = this.root.locator('.dialog__body');
    this.footer = this.root.locator('.dialog__footer');
    this.rows = this.root.locator('.setting-row');
    this.switches = this.root.getByRole('switch');
    this.save = this.footer.getByRole('button', { name: /^(Save|Saving…)$/ });
    this.cancel = this.footer.getByRole('button', { name: 'Cancel' });
    this.alert = this.root.locator('.alert');
  }

  /** The switch of one feature: "Plan", "Schedules". */
  feature(name: string): Locator {
    return this.root.getByRole('switch', { name, exact: true });
  }

  row(name: string): Locator {
    return this.rows.filter({ hasText: name });
  }
}
