import type { Locator, Page } from '@playwright/test';

/**
 * "New story" (L2-069): what needs doing, where it goes, how big it is, who is on it and its
 * tag, with "Add to To do" or "Add to backlog" as its action.
 */
export class NewStoryDialog {
  readonly root: Locator;
  readonly panel: Locator;
  readonly heading: Locator;
  readonly close: Locator;
  readonly title: Locator;
  readonly titleError: Locator;
  readonly where: Locator;
  readonly size: Locator;
  readonly sizeHint: Locator;
  readonly who: Locator;
  readonly whoHint: Locator;
  readonly tags: Locator;
  readonly failed: Locator;
  readonly action: Locator;
  /** Regions for the sweeps and the parity specs. */
  readonly body: Locator;
  readonly footer: Locator;
  /** A field with its label: the mock's fieldset, the app's picker. */
  readonly sizeField: Locator;
  readonly whoField: Locator;
  readonly tagField: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('dialog', { name: 'New story' });
    this.panel = this.root.locator('.dialog__panel');
    this.heading = this.root.getByRole('heading', { level: 2, name: 'New story' });
    this.close = this.root.getByRole('button', { name: 'Close' });
    this.body = this.root.locator('.dialog__body');
    this.footer = this.root.locator('.dialog__footer');
    this.title = this.root.getByLabel('What needs doing?');
    this.titleError = this.root.locator('.field__error');
    this.where = this.root.getByRole('radiogroup', { name: 'Where does it go?' });
    this.size = this.root.getByRole('radiogroup', { name: 'How big is it?' });
    this.sizeHint = this.root.getByText('1 is a quick text. 8 is a weekend of phone calls.');
    this.who = this.root.getByRole('group', { name: 'Who’s on it?' });
    this.whoHint = this.root.getByText('No one yet. Anyone can pick it up.');
    this.tags = this.root.getByRole('radiogroup', { name: 'Tag' });
    this.failed = this.root.getByRole('alert').filter({ hasText: 'We couldn’t save that.' });
    this.action = this.footer.getByRole('button');
    const field = (selector: string, label: string) =>
      this.body.locator(`fieldset, ${selector}`).filter({
        has: page.getByText(label, { exact: true }),
      });
    this.sizeField = field('div[pk-points-picker]', 'How big is it?');
    this.whoField = field('div[pk-who-chips]', 'Who’s on it?');
    this.tagField = field('div[pk-tag-picker]', 'Tag');
  }

  /** A choice of "Where does it go?": "Backlog" or "This sprint". */
  whereTo(name: 'Backlog' | 'This sprint'): Locator {
    return this.where.getByRole('radio', { name, exact: true });
  }

  points(n: number): Locator {
    return this.size.getByRole('radio', { name: String(n), exact: true });
  }

  member(name: string): Locator {
    return this.who.getByRole('button', { name, exact: true });
  }

  tag(name: string): Locator {
    return this.tags.getByRole('radio', { name, exact: true });
  }
}
