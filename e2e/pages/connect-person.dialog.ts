import type { Locator, Page } from '@playwright/test';

/** Connect (L2-150), from Connections, a profile's form, or the empty map. */
export class ConnectPersonDialog {
  readonly root: Locator;
  readonly panel: Locator;
  readonly heading: Locator;
  readonly close: Locator;
  /** "Connect", from the empty map: who to connect first. */
  readonly first: Locator;
  readonly firstError: Locator;
  readonly search: Locator;
  readonly who: Locator;
  readonly people: Locator;
  readonly whoError: Locator;
  readonly how: Locator;
  readonly words: Locator;
  readonly promised: Locator;
  readonly noResults: Locator;
  readonly add: Locator;
  readonly summary: Locator;
  readonly submit: Locator;
  readonly failed: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('dialog', { name: /^Connect / });
    this.panel = this.root.locator('.dialog__panel');
    this.heading = this.root.getByRole('heading', { level: 2 }).first();
    this.close = this.root.getByRole('button', { name: 'Close' });
    this.first = this.root.getByRole('combobox', { name: 'Connect' });
    this.firstError = this.root.locator('#first-err');
    this.search = this.root.getByRole('searchbox', { name: 'Search your people' });
    this.who = this.root.getByRole('radiogroup', { name: 'Who' });
    this.people = this.who.getByRole('radio');
    this.whoError = this.root.locator('#people-list-err, #who-error');
    this.how = this.root.getByRole('radiogroup', { name: 'How they know each other' });
    this.words = this.root.getByRole('textbox', { name: 'In your words' });
    this.promised = this.root.getByRole('switch', { name: 'Not introduced yet' });
    this.noResults = this.root.locator('.empty');
    this.add = this.noResults.getByRole('link');
    this.summary = this.root.locator('.form-summary');
    this.submit = this.root
      .locator('.dialog__footer')
      .getByRole('button')
      .or(this.root.locator('.dialog__footer').getByRole('link'));
    this.failed = this.root.locator('.alert');
  }

  person(name: string): Locator {
    return this.who.getByRole('radio', { name, exact: true });
  }

  kind(name: string): Locator {
    return this.how.getByRole('radio', { name, exact: true });
  }
}
