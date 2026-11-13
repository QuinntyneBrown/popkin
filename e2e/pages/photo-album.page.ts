import type { Locator, Page } from '@playwright/test';

type Chosen = { name: string; mimeType: string; buffer: Buffer };

/** Photos, the Popkin's shared album, `/p/:popkinId/photos` (L2-031, L2-032). */
export class PhotoAlbumPage {
  readonly root: Locator;
  readonly screen: Locator;
  readonly header: Locator;
  readonly heading: Locator;
  readonly summary: Locator;
  readonly filters: Locator;
  readonly everyone: Locator;
  readonly mine: Locator;
  /** "Add photos" in the header, from 768 px. */
  readonly addInHeader: Locator;
  /** "Add", the floating action of a phone. */
  readonly addFloating: Locator;
  /** "Add photos" of the empty album and of Mine with none. */
  readonly addFirst: Locator;
  readonly showEveryones: Locator;
  readonly days: Locator;
  readonly grids: Locator;
  readonly thumbnails: Locator;
  readonly loading: Locator;
  readonly skeletons: Locator;
  readonly empty: Locator;
  readonly emptyHeading: Locator;
  readonly error: Locator;
  readonly tryAgain: Locator;
  readonly moreFailed: Locator;
  readonly tryMoreAgain: Locator;
  readonly nav: Locator;
  readonly currentTab: Locator;
  /** Regions for the sweeps and the parity specs. */
  readonly album: Locator;
  readonly firstGrid: Locator;
  readonly firstDay: Locator;
  readonly fab: Locator;
  readonly faces: Locator;
  readonly headerAction: Locator;
  readonly albumSkeleton: Locator;
  private readonly picker: Locator;

  constructor(page: Page) {
    this.root = page.locator('body[data-page="photo-album"]');
    this.screen = page.locator('.screen');
    this.header = page.locator('.tab-header');
    this.heading = this.header.getByRole('heading', { level: 1 });
    this.summary = this.header.locator('.tab-header__summary');
    this.filters = page.getByRole('group', { name: 'Filter' });
    this.everyone = this.filters.getByRole('button', { name: 'Everyone' });
    this.mine = this.filters.getByRole('button', { name: 'Mine' });
    this.addInHeader = this.header.getByRole('button', { name: 'Add photos' });
    this.fab = page.locator('.fab');
    this.addFloating = this.fab;
    this.album = page.locator('.album');
    this.empty = this.album.locator('.empty');
    this.emptyHeading = this.empty.getByRole('heading');
    this.addFirst = this.empty.getByRole('button', { name: 'Add photos' });
    this.showEveryones = this.empty.getByRole('button', { name: 'Show everyone’s' });
    this.days = this.album.locator('.group-label');
    this.grids = this.album.locator('.photo-grid');
    this.firstGrid = this.grids.first();
    this.firstDay = this.days.first();
    this.thumbnails = this.album.locator('.photo-grid a');
    this.loading = this.album.getByRole('status');
    this.skeletons = this.album.locator('.skeleton');
    this.error = this.album.getByRole('alert');
    this.tryAgain = this.error.getByRole('button', { name: 'Try again' });
    this.moreFailed = this.album.locator('.alert');
    this.tryMoreAgain = this.moreFailed.getByRole('button', { name: 'Try again' });
    this.nav = page.getByRole('navigation', { name: 'Popkin' });
    this.currentTab = this.nav.locator('[aria-current="page"]');
    this.picker = page.locator('input[type="file"]');
    this.faces = this.header.locator('.avatar-stack');
    this.headerAction = this.header.locator('.tab-header__action');
    this.albumSkeleton = this.album.locator('[aria-hidden="true"]').first();
  }

  thumbnail(name: string): Locator {
    return this.album.getByRole('link', { name, exact: true }).first();
  }

  /** The photos under a day's heading, by their names. */
  async photosOf(day: string): Promise<string[]> {
    const index = (await this.days.allTextContents()).indexOf(day);
    if (index < 0) return [];
    return this.grids
      .nth(index)
      .locator('img')
      .evaluateAll((images) => images.map((image) => image.getAttribute('alt') ?? ''));
  }

  /** Chooses these files in the device's picker, as "Add" lets a member do. */
  async choose(files: Chosen[]): Promise<void> {
    await this.picker.setInputFiles(files);
  }

  /** What the picker offers: several files, and which types. */
  async pickerOffers(): Promise<{ multiple: boolean; accept: string }> {
    return this.picker.evaluate((input: HTMLInputElement) => ({
      multiple: input.multiple,
      accept: input.accept,
    }));
  }

  /** How many photos sit side by side in a full row of the first day. */
  async across(): Promise<number> {
    const tops = await this.firstGrid
      .locator('a')
      .evaluateAll((cells) => cells.map((cell) => Math.round(cell.getBoundingClientRect().top)));
    const rows = new Map<number, number>();
    for (const top of tops) rows.set(top, (rows.get(top) ?? 0) + 1);
    return Math.max(...rows.values());
  }

  /** How many times wider and taller the first photo is than the second. */
  async featureScale(): Promise<{ width: number; height: number }> {
    const [first, second] = await this.firstGrid.locator('a').evaluateAll((cells) =>
      cells.slice(0, 2).map((cell) => {
        const box = cell.getBoundingClientRect();
        return { width: box.width, height: box.height };
      }),
    );
    return {
      width: Math.round((first.width / second.width) * 10) / 10,
      height: Math.round((first.height / second.height) * 10) / 10,
    };
  }

  /** Scrolls to the end of the album, where more photos are asked for. */
  async toTheEnd(): Promise<void> {
    await this.thumbnails.last().scrollIntoViewIfNeeded();
  }
}
