import type { Locator, Page } from '@playwright/test';

/** "Add photos": the chosen photos, their captions and the upload (L2-031). */
export class AddPhotosDialog {
  readonly root: Locator;
  readonly panel: Locator;
  readonly heading: Locator;
  readonly close: Locator;
  readonly rows: Locator;
  readonly action: Locator;
  readonly progress: Locator;
  readonly progressText: Locator;
  readonly outcome: Locator;
  readonly notice: Locator;
  /** Regions for the sweeps and the parity specs. */
  readonly body: Locator;
  readonly footer: Locator;
  readonly list: Locator;
  readonly header: Locator;
  readonly description: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('dialog', { name: 'Add photos' });
    this.panel = this.root.locator('.dialog__panel');
    this.heading = this.root.getByRole('heading', { level: 2 });
    this.close = this.root.getByRole('button', { name: 'Close' });
    this.body = this.root.locator('.dialog__body');
    this.footer = this.root.locator('.dialog__footer');
    this.list = this.body.getByRole('list');
    this.header = this.root.locator('.dialog__header');
    this.description = this.root.locator('.dialog__desc');
    this.rows = this.root.locator('.upload-item');
    this.action = this.footer.getByRole('button');
    this.progress = this.root.getByRole('progressbar', { name: 'Uploading' });
    this.progressText = this.root.getByText(/^Uploading \d+ of \d+$/);
    this.outcome = this.root.locator('.alert--danger');
    this.notice = this.root.locator('.alert--info');
  }

  caption(n: number): Locator {
    return this.root.getByLabel(`Caption for photo ${n}`, { exact: true });
  }

  row(n: number): Locator {
    return this.rows.nth(n - 1);
  }

  /** Why photo `n` is not in the album: the reason it will not be added, or that it failed. */
  problemOf(n: number): Locator {
    return this.row(n).locator('.field__error');
  }

  /** "Uploading" or "Added", over the thumbnail of photo `n`. */
  stateOf(n: number): Locator {
    return this.row(n).locator('.upload-item__state');
  }

  countOf(n: number): Locator {
    return this.row(n).locator('.field__count');
  }

  tryAgain(n: number): Locator {
    return this.row(n).getByRole('button', { name: 'Try again' });
  }

  /** Whether the panel sits on the bottom edge of the screen, as a sheet does. */
  async isSheet(viewportHeight: number): Promise<boolean> {
    const box = await this.panel.boundingBox();
    return !!box && Math.abs(box.y + box.height - viewportHeight) <= 1;
  }
}
