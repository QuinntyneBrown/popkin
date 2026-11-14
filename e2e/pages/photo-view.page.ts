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
  /** "Save photo", and "Photo actions" for whoever may delete the photo (L2-036). */
  readonly save: Locator;
  readonly photoActions: Locator;
  /** The react bar of the quick five and "More reactions", and "Comment" beside it (L2-034). */
  readonly reactBar: Locator;
  readonly react: (name: string) => Locator;
  readonly moreReactions: Locator;
  readonly comment: Locator;
  /** From 1024 px: the comments in the side panel, and its field "Add a comment" (L2-035). */
  readonly panelComments: Locator;
  readonly panelField: Locator;
  readonly commentField: Locator;
  readonly postComment: Locator;
  /** A photo deleted while it was open: "This photo was removed" (L2-036). */
  readonly removed: Locator;
  readonly backToPhotos: Locator;
  /** Regions for the sweeps and the parity specs. */
  readonly titles: Locator;
  readonly captionRegion: Locator;

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
    this.save = this.bar.getByRole('button', { name: 'Save photo' });
    // A link in the mock, a button in the app.
    this.photoActions = this.bar.getByLabel('Photo actions');
    this.reactBar = this.panel.getByRole('group', { name: 'React' });
    this.react = (name) => this.reactBar.getByRole('button', { name: `React ${name}` });
    this.moreReactions = this.reactBar.getByLabel('More reactions');
    this.comment = this.panel.locator('.stage-btn');
    this.panelComments = this.panel.locator('.photo-info__comments');
    this.panelField = this.panel.locator('.photo-info__composer');
    this.commentField = this.panelField.getByRole('textbox', { name: 'Add a comment' });
    this.postComment = this.panelField.getByRole('button', { name: 'Post comment' });
    this.removed = this.screen.locator('.stage-message');
    this.backToPhotos = this.removed.getByRole('link', { name: 'Back to Photos' });
    this.titles = this.bar.locator('.topbar__titles');
    this.captionRegion = this.panel.getByRole('heading', { level: 1 });
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
