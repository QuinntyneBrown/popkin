import type { Locator, Page } from '@playwright/test';

/** Added, `/contacts/people/:contactId/added` (L2-180, L2-181). */
export class ContactAddedPage {
  readonly root: Locator;
  readonly avatar: Locator;
  readonly tick: Locator;
  readonly heading: Locator;
  readonly line: Locator;
  readonly count: Locator;
  readonly addMore: Locator;
  readonly done: Locator;
  readonly addAnother: Locator;
  readonly notFound: Locator;

  constructor(page: Page) {
    this.root = page.locator('body[data-page="contact-added"]');
    this.avatar = page.locator('.avatar-tick');
    this.tick = this.avatar.locator('.avatar-tick__mark');
    this.heading = page.getByRole('heading', { level: 1 });
    this.line = page.locator('.screen__body p').first();
    this.count = page.getByText(/people added today$/);
    this.addMore = page.getByRole('link', { name: /Add a birthday, how you met…/ });
    this.done = page.getByRole('link', { name: 'Done' });
    this.addAnother = page.getByRole('link', { name: 'Add another' });
    this.notFound = page.locator('.empty-state');
  }
}
