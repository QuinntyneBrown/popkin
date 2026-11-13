import type { Locator, Page } from '@playwright/test';
import { mockToday } from '../../../e2e/fixtures/journeys';
import {
  type Album,
  aFileOf,
  aPhoto,
  albumOf,
  albumUrl,
  maraInTheAlbum,
  photoUrl,
  someoneAddsAPhoto,
  theMockAlbum,
  theThree,
} from '../../../e2e/fixtures/photos';
import { test } from '../../../e2e/fixtures/pk-test';
import { AddPhotosDialog } from '../../../e2e/pages/add-photos.dialog';
import { PhotoAlbumPage } from '../../../e2e/pages/photo-album.page';
import { PhotoViewPage } from '../../../e2e/pages/photo-view.page';
import { SIZES, detail, frame, shot, type Size } from '../../../tools/video-record/shots';

/**
 * The screenshots of video 05: journey 5, Share photos, in the running app. Every /api request is
 * answered by the album stub of `e2e/fixtures/photos.ts`, the home stub or the recording, and the
 * hub by `e2e/fixtures/hub.ts` (ADR 0005, ADR 0010); no backend ran. Not a test and not a sweep:
 * only `node tools/video-record/record.mjs docs/videos/05-journey-05-share-photos` runs it.
 */
const sizes = Object.keys(SIZES) as Size[];
const [lake, bonfire] = theMockAlbum();

/**
 * Mara, the Host, in the album of Lakeside Weekend on the mocks' Saturday (12 September 2026), at
 * twenty to noon on the device: the pictures take a while and the clock runs, so the time left in
 * the sidebar stays the same for every shot.
 */
async function maraOnSaturday(page: Page, change?: (album: Album) => void): Promise<Album> {
  await page.clock.install({ time: new Date(mockToday.getTime() - 20 * 60_000) });
  return maraInTheAlbum(page, (album) => change?.(album));
}

/** Opens the album and waits until its photos are drawn. */
async function open(page: Page, count = 18): Promise<PhotoAlbumPage> {
  const album = new PhotoAlbumPage(page);
  await page.goto(albumUrl);
  if (count) await album.thumbnails.nth(count - 1).waitFor();
  await pictures(page);
  return album;
}

/** Waits until every picture on the page has arrived. */
async function pictures(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page.evaluate(() =>
    Promise.all(
      [...document.images].map((image) => image.complete || image.decode().catch(() => undefined)),
    ),
  );
}

/** Opens a photo full screen and waits for the picture itself. */
async function view(page: Page, id: string): Promise<PhotoViewPage> {
  const photo = new PhotoViewPage(page);
  await page.goto(photoUrl(id));
  await photo.caption.waitFor();
  await pictures(page);
  return photo;
}

const closeUp = (region: Locator, name: string, pad = 12) => detail(region, name, pad);

test('the album at every form factor, and in the dark', async ({ page }) => {
  await maraOnSaturday(page);
  for (const size of sizes) {
    await frame(page, size);
    const album = await open(page);
    await shot(page, `album-${size.toLowerCase()}`);
    if (size === 'XS') {
      await closeUp(album.header, 'album-header', 8);
      await closeUp(album.firstGrid, 'album-grid', 8);
      await closeUp(album.addFloating, 'add-floating', 14);
    }
    if (size === 'M') await closeUp(album.addInHeader, 'add-in-header', 14);
  }
  await frame(page, 'XS', 'dark');
  await open(page);
  await shot(page, 'album-xs-dark');
});

test('Everyone and Mine, and the empty album', async ({ page }) => {
  const fixture = await maraOnSaturday(page);
  await frame(page, 'XS');
  const album = await open(page);
  await closeUp(album.filters, 'filter-everyone', 10);

  await album.mine.click();
  await album.days.filter({ hasText: 'Friday' }).waitFor({ state: 'detached' });
  await pictures(page);
  await shot(page, 'mine-xs');
  await closeUp(album.filters, 'filter-mine', 10);

  fixture.empty();
  await open(page, 0);
  await album.emptyHeading.waitFor();
  await shot(page, 'empty-xs');
  await closeUp(album.empty, 'empty', 8);
});

test('Add photos: three chosen, a caption, and the upload', async ({ page }) => {
  await maraOnSaturday(page);
  await frame(page, 'XS');
  const album = await open(page);
  const release = albumOf(page).holdUploads();
  await album.choose(theThree());
  const dialog = new AddPhotosDialog(page);
  await dialog.rows.nth(2).waitFor();
  await pictures(page);
  await shot(page, 'add-xs');

  await dialog.caption(1).fill('Dock at dawn');
  await dialog.caption(1).blur();
  await shot(page, 'add-caption-xs');
  await closeUp(dialog.row(1), 'add-row', 8);
  await closeUp(dialog.action, 'add-action', 12);

  await dialog.action.click();
  await dialog.progressText.filter({ hasText: 'Uploading 1 of 3' }).waitFor();
  await shot(page, 'adding-xs');
  await closeUp(dialog.footer, 'adding-footer', 0);

  release();
  await dialog.root.waitFor({ state: 'detached' });
  await album.thumbnails.nth(20).waitFor();
  await pictures(page);
  await shot(page, 'added-xs');
  await closeUp(album.header, 'added-header', 8);
});

test('Add photos at 1440 px', async ({ page }) => {
  await maraOnSaturday(page);
  await frame(page, 'XL');
  const album = await open(page);
  await album.choose(theThree());
  const dialog = new AddPhotosDialog(page);
  await dialog.rows.nth(2).waitFor();
  await pictures(page);
  await shot(page, 'add-xl');
});

test('a 14 MB file is marked and left out', async ({ page }) => {
  await maraOnSaturday(page);
  await frame(page, 'XS');
  const album = await open(page);
  await album.choose([aPhoto('lake.jpg'), aPhoto('bonfire.jpg'), aFileOf(14)]);
  const dialog = new AddPhotosDialog(page);
  await dialog.problemOf(3).waitFor();
  await pictures(page);
  await shot(page, 'too-large-xs');
  await closeUp(dialog.row(3), 'too-large-row', 8);
  await closeUp(dialog.action, 'too-large-action', 12);
});

test('one that failed is kept, with "Try again"', async ({ page }) => {
  await maraOnSaturday(page);
  await frame(page, 'XS');
  const album = await open(page);
  albumOf(page).failUpload('hike.jpg');
  await album.choose(theThree());
  const dialog = new AddPhotosDialog(page);
  await dialog.action.click();
  await dialog.tryAgain(3).waitFor();
  await pictures(page);
  await shot(page, 'failed-xs');
  await closeUp(dialog.outcome, 'failed-outcome', 8);
  await closeUp(dialog.row(3), 'failed-row', 8);
});

test('a photo someone else adds appears', async ({ page, hub }) => {
  await maraOnSaturday(page);
  await frame(page, 'XS');
  const album = await open(page);
  await hub.connected();
  await test.expect.poll(() => albumOf(page).asked.length).toBe(2);
  await shot(page, 'live-before-xs');
  await closeUp(album.header, 'live-before-header', 8);

  await someoneAddsAPhoto(page, 'Canoe race');
  await album.thumbnail('Canoe race').waitFor();
  await album.summary.filter({ hasText: '49 photos' }).waitFor();
  await pictures(page);
  await shot(page, 'live-after-xs');
  await closeUp(album.header, 'live-after-header', 8);
});

test('a photo, full screen, at every form factor', async ({ page }) => {
  await maraOnSaturday(page);
  for (const size of sizes) {
    await frame(page, size);
    const photo = await view(page, lake.id);
    await shot(page, `photo-${size.toLowerCase()}`);
    if (size === 'XS') {
      await closeUp(photo.bar, 'photo-bar', 0);
      await closeUp(photo.caption, 'photo-caption', 16);
    }
    if (size === 'XL') await closeUp(photo.panel, 'photo-panel', 0);
  }
  await frame(page, 'XS');
  const photo = await view(page, lake.id);
  await page.keyboard.press('ArrowRight');
  await photo.caption.filter({ hasText: bonfire.caption ?? '' }).waitFor();
  await pictures(page);
  await shot(page, 'photo-next-xs');
  await photo.swipe('left');
  await photo.caption.filter({ hasText: 'Ridge trail' }).waitFor();
  await pictures(page);
  await shot(page, 'photo-third-xs');
});
