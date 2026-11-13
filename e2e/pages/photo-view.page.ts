import type { Locator, Page } from '@playwright/test';

/** One photo, full screen on a dark stage, `/p/:popkinId/photos/:photoId` (L2-033). */
export class PhotoViewPage {
  readonly root: Locator;
  readonly screen: Locator;
  readonly bar: Locator;
  readonly close: Locator;
  /** Who added it and when, in the bar on a phone. */
  readonly name: Locator;
  readonly time: Locator;
  /** The same beside the photo, from 1024 px. */
  readonly panel: Locator;
  readonly panelBy: Locator;
  readonly stage: Locator;
  readonly photo: Locator;
  readonly caption: Locator;
  readonly reactions: Locator;
  readonly comments: Locator;
  readonly loading: Locator;
  readonly error: Locator;
  readonly errorHeading: Locator;
  readonly tryAgain: Locator;

  constructor(private readonly page: Page) {
    this.root = page.locator('body[data-page="photo-view"]');
    this.screen = page.locator('.screen--stage');
    this.bar = this.screen.locator('.topbar');
    this.close = this.bar.getByRole('button', { name: 'Close' });
    this.name = this.bar.locator('.photo-viewer__name');
    this.time = this.bar.locator('.topbar__sub');
    this.panel = this.screen.locator('.photo-info');
    this.panelBy = this.panel.locator('.photo-info__by');
    this.stage = this.screen.locator('.photo-stage');
    this.photo = this.stage.getByRole('img');
    this.caption = this.screen.getByRole('heading', { level: 1 });
    this.reactions = this.panel.locator('.stage-chip');
    this.comments = this.panel.locator('.photo-info__comment-count');
    this.loading = this.screen.getByRole('status');
    this.error = this.screen.getByRole('alert');
    this.errorHeading = this.error.getByRole('heading');
    this.tryAgain = this.error.getByRole('button', { name: 'Try again' });
  }

  /** Whether the whole photo shows: nothing of it is cropped away. */
  async showsTheWholePhoto(): Promise<boolean> {
    await this.photo.evaluate(
      (image: HTMLImageElement) => image.complete || new Promise((done) => (image.onload = done)),
    );
    return this.photo.evaluate((image: HTMLImageElement) => {
      const fit = getComputedStyle(image).objectFit;
      const box = image.getBoundingClientRect();
      const ratio = image.naturalWidth / image.naturalHeight;
      return fit === 'contain' || Math.abs(box.width / box.height - ratio) < 0.02;
    });
  }

  /** Drags a finger across the photo: to the left for the next, to the right for the previous. */
  async swipe(direction: 'left' | 'right'): Promise<void> {
    const box = await this.stage.boundingBox();
    if (!box) throw new Error('The photo is not on screen.');
    const y = box.y + box.height / 2;
    const from = box.x + box.width * (direction === 'left' ? 0.8 : 0.2);
    const to = box.x + box.width * (direction === 'left' ? 0.2 : 0.8);
    await this.page.mouse.move(from, y);
    await this.page.mouse.down();
    await this.page.mouse.move((from + to) / 2, y, { steps: 4 });
    await this.page.mouse.move(to, y, { steps: 4 });
    await this.page.mouse.up();
  }

  /** Whether the photo's author is beside it, in the panel, and not only in the bar. */
  async authorIsBeside(): Promise<boolean> {
    const [by, stage] = await Promise.all([this.panelBy.boundingBox(), this.stage.boundingBox()]);
    return !!by && !!stage && by.x >= stage.x + stage.width - 1;
  }
}
