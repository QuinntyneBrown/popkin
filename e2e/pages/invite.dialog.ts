import type { Locator, Page } from '@playwright/test';

/** "Bring someone in", the invite dialog (L2-011 AC1 to AC4). */
export class InviteDialog {
  readonly root: Locator;
  readonly panel: Locator;
  readonly heading: Locator;
  readonly description: Locator;
  readonly close: Locator;
  readonly qr: Locator;
  readonly tile: Locator;
  readonly name: Locator;
  readonly link: Locator;
  readonly copy: Locator;
  readonly status: Locator;
  readonly backdrop: Locator;
  readonly error: Locator;
  readonly tryAgain: Locator;
  /** Regions for the sweeps and the parity specs. */
  readonly qrCard: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('dialog', { name: 'Bring someone in' });
    this.panel = this.root.locator('.dialog__panel');
    this.heading = this.root.getByRole('heading', { level: 2 });
    this.description = this.root.locator('.dialog__desc');
    this.close = this.root.getByRole('button', { name: 'Close' });
    this.qr = this.root.getByRole('img', { name: /^QR code for / });
    this.qrCard = this.root.locator('.qr-card');
    this.tile = this.qrCard.locator('.qr-card__name > [aria-hidden="true"]');
    this.name = this.qrCard.locator('.qr-card__name');
    this.link = this.qrCard.locator('.qr-card__link');
    this.copy = this.root.getByRole('button', { name: /^(Copy invite link|Copied)$/ });
    this.status = this.root.getByRole('status');
    this.backdrop = page.locator('.backdrop');
    this.error = this.root.getByRole('alert');
    this.tryAgain = this.error.getByRole('button', { name: 'Try again' });
  }

  /** Whether the panel sits on the bottom edge of the screen, as a sheet does. */
  async isSheet(viewportHeight: number): Promise<boolean> {
    const box = await this.panel.boundingBox();
    return !!box && Math.abs(box.y + box.height - viewportHeight) <= 1;
  }
}
