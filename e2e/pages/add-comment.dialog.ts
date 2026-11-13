import type { Locator, Page } from '@playwright/test';

/** "Add a comment": the member's stars and their words about an experience (L2-041). */
export class AddCommentDialog {
  readonly root: Locator;
  readonly panel: Locator;
  /** The dialog is named by the experience's title. */
  readonly heading: Locator;
  readonly close: Locator;
  /** The member's stars, one image named "5 out of 5". */
  readonly stars: Locator;
  readonly yourRating: Locator;
  readonly comment: Locator;
  readonly hint: Locator;
  readonly error: Locator;
  readonly action: Locator;
  /** Regions for the sweeps and the parity specs. */
  readonly body: Locator;
  readonly footer: Locator;
  readonly rating: Locator;
  readonly commentField: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('dialog');
    this.panel = this.root.locator('.dialog__panel');
    this.heading = this.root.getByRole('heading', { level: 2 });
    this.close = this.root.getByRole('button', { name: 'Close' });
    this.body = this.root.locator('.dialog__body');
    this.footer = this.root.locator('.dialog__footer');
    this.stars = this.body.getByRole('img');
    this.yourRating = this.body.getByText('Your rating');
    this.rating = this.yourRating.locator('..');
    this.comment = this.root.getByLabel('Your comment');
    this.commentField = this.body.locator('.field');
    this.hint = this.commentField.locator('.field__hint');
    this.error = this.commentField.locator('.field__error');
    this.action = this.footer.getByRole('button');
  }
}
