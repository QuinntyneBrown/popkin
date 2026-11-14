import type { Locator, Page } from '@playwright/test';

/** "Message actions": reactions, Reply, Copy and, on the member's own message, Delete (L2-024 AC1). */
export class ReactionsDialog {
  readonly root: Locator;
  readonly panel: Locator;
  readonly heading: Locator;
  readonly close: Locator;
  /** One line of the message the actions are for. */
  readonly quote: Locator;
  /** The quick reactions, "React heart" and the rest. */
  readonly quick: Locator;
  readonly moreReactions: Locator;
  /** The reactions behind "More reactions". */
  readonly more: Locator;
  readonly reply: Locator;
  readonly copy: Locator;
  readonly delete: Locator;
  /** Regions for the sweeps and the parity specs. */
  readonly body: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('dialog', { name: 'Message actions' });
    this.panel = this.root.locator('.dialog__panel');
    this.heading = this.root.getByRole('heading', { level: 2 });
    this.close = this.root.getByRole('button', { name: 'Close' });
    this.body = this.root.locator('.dialog__body');
    this.quote = this.root.locator('.bubble__quote');
    this.quick = this.root.getByRole('group', { name: 'Reactions' }).getByRole('button');
    this.moreReactions = this.root.getByRole('button', { name: 'More reactions' });
    this.more = this.root.getByRole('group', { name: 'More reactions' }).getByRole('button');
    this.reply = this.root.getByRole('button', { name: 'Reply', exact: true });
    this.copy = this.root.getByRole('button', { name: 'Copy', exact: true });
    this.delete = this.root.getByRole('button', { name: 'Delete', exact: true });
  }

  /** The names of the quick reactions, in order. */
  async quickNames(): Promise<string[]> {
    return this.quick.evaluateAll((buttons) =>
      buttons.map((button) => button.getAttribute('aria-label') ?? ''),
    );
  }

  /** The reaction named so: "heart" is "React heart". */
  react(name: string): Locator {
    return this.root.getByRole('button', { name: `React ${name}`, exact: true });
  }
}
