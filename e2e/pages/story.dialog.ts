import type { Locator, Page } from '@playwright/test';

/**
 * The Story dialog (L2-070): titled with the story, it shows its column, points, owner, tag and
 * due date, and moves it on, marks it done, saves a change or deletes it.
 */
export class StoryDialog {
  readonly root: Locator;
  readonly panel: Locator;
  readonly heading: Locator;
  readonly close: Locator;
  readonly line: Locator;
  readonly title: Locator;
  readonly where: Locator;
  readonly size: Locator;
  readonly who: Locator;
  readonly tags: Locator;
  readonly due: Locator;
  readonly moveOn: Locator;
  readonly markDone: Locator;
  readonly save: Locator;
  readonly delete: Locator;
  readonly failed: Locator;
  /** Regions for the sweeps and the parity specs. */
  readonly body: Locator;
  readonly footer: Locator;

  constructor(page: Page, title: string | RegExp = /.+/) {
    this.root = page.getByRole('dialog', { name: title });
    this.panel = this.root.locator('.dialog__panel');
    this.heading = this.root.getByRole('heading', { level: 2 });
    this.close = this.root.getByRole('button', { name: 'Close' });
    this.line = this.root.locator('#dlg-desc');
    this.body = this.root.locator('.dialog__body');
    this.footer = this.root.locator('.dialog__footer');
    this.title = this.root.getByLabel('What needs doing?');
    this.where = this.root.getByRole('radiogroup', { name: 'Where does it go?' });
    this.size = this.root.getByRole('radiogroup', { name: 'How big is it?' });
    this.who = this.root.getByRole('group', { name: 'Who’s on it?' });
    this.tags = this.root.getByRole('radiogroup', { name: 'Tag' });
    this.due = this.root.getByRole('textbox', { name: /^Due/ });
    this.moveOn = this.footer.getByRole('button', { name: /^Move to / });
    this.markDone = this.footer.getByRole('button', { name: 'Mark done' });
    this.save = this.footer.getByRole('button', { name: /^(Save|Saving…)$/ });
    this.delete = this.footer.getByRole('button', { name: 'Delete' });
    this.failed = this.root.getByRole('alert');
  }

  whereTo(name: 'Backlog' | 'This sprint' | 'Doing' | 'Done'): Locator {
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
