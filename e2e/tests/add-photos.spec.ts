import { aFileOf, aPhoto, albumOf, albumUrl, theMockPhotos, theThree } from '../fixtures/photos';
import { expect, test } from '../fixtures/pk-test';
import { AddPhotosDialog } from '../pages/add-photos.dialog';
import { PhotoAlbumPage } from '../pages/photo-album.page';

test.describe('Add photos', () => {
  test.beforeEach(async ({ page }) => {
    await theMockPhotos(page);
    await page.goto(albumUrl);
    await expect(new PhotoAlbumPage(page).thumbnails).toHaveCount(18);
  });

  // L2-031 AC1
  test('the picker takes several photos of the allowed types', async ({ page }) => {
    const offers = await new PhotoAlbumPage(page).pickerOffers();

    expect(offers.multiple).toBe(true);
    for (const type of ['image/jpeg', 'image/png', 'image/webp', 'image/heic']) {
      expect(offers.accept).toContain(type);
    }
  });

  // L2-031 AC1
  test('shows the chosen photos, a caption for each and an action that counts them', async ({
    page,
  }) => {
    await new PhotoAlbumPage(page).choose(theThree());
    const dialog = new AddPhotosDialog(page);

    await expect(dialog.heading).toHaveText('Add photos');
    await expect(dialog.root).toHaveAccessibleDescription(
      'JPEG, PNG, WebP or HEIC, up to 10 MB each. Location data is removed.',
    );
    await expect(dialog.rows).toHaveCount(3);
    await expect(dialog.caption(1)).toBeEditable();
    await expect(dialog.caption(3)).toBeEditable();
    await expect(dialog.action).toHaveText('Add 3 photos');
    await expect(dialog.action).toBeEnabled();
  });

  // L2-031 AC1, AC4, AC7
  test('adds the photos with their captions; they are in the album when it closes', async ({
    page,
  }) => {
    const album = new PhotoAlbumPage(page);
    await album.choose(theThree());
    const dialog = new AddPhotosDialog(page);
    await dialog.caption(1).fill('Dock at dawn');

    await dialog.action.click();

    await expect(dialog.root).toHaveCount(0);
    expect(albumOf(page).uploaded).toEqual([
      { name: 'lake.jpg', caption: 'Dock at dawn' },
      { name: 'bonfire.jpg', caption: null },
      { name: 'hike.jpg', caption: null },
    ]);
    await expect(album.thumbnails).toHaveCount(21);
    await expect(album.thumbnail('Dock at dawn')).toBeVisible();
    await expect(album.summary).toContainText('51 photos from 11 people');
  });

  // L2-031 AC4
  test('shows how far the upload is and disables the action while photos upload', async ({
    page,
  }) => {
    const release = albumOf(page).holdUploads();
    await new PhotoAlbumPage(page).choose(theThree());
    const dialog = new AddPhotosDialog(page);

    await dialog.action.click();

    await expect(dialog.action).toHaveText('Adding…');
    await expect(dialog.action).toBeDisabled();
    await expect(dialog.progress).toBeVisible();
    await expect(dialog.progressText).toHaveText('Uploading 1 of 3');
    await expect(dialog.stateOf(1)).toHaveText('Uploading');
    await expect(dialog.caption(1)).not.toBeEditable();

    release();
    await expect(dialog.root).toHaveCount(0);
  });

  // L2-031 AC2
  test('marks a photo over 10 MB with the reason and adds the others', async ({ page }) => {
    const album = new PhotoAlbumPage(page);
    await album.choose([aPhoto('lake.jpg'), aPhoto('bonfire.jpg'), aFileOf(14)]);
    const dialog = new AddPhotosDialog(page);

    await expect(dialog.problemOf(3)).toHaveText('This file is 14 MB. Photos can be up to 10 MB.');
    await expect(dialog.caption(3)).toHaveAttribute('aria-invalid', 'true');
    await expect(dialog.action).toHaveText('Add 2 photos');

    await dialog.action.click();

    await expect(dialog.action).toHaveText('Done');
    expect(albumOf(page).uploaded.map((sent) => sent.name)).toEqual(['lake.jpg', 'bonfire.jpg']);
    await dialog.action.click();
    await expect(album.thumbnails).toHaveCount(20);
  });

  // L2-031 AC2
  test('marks a file that is not a photo and has nothing to add when it is alone', async ({
    page,
  }) => {
    await new PhotoAlbumPage(page).choose([aFileOf(1, 'clip.mov', 'video/quicktime')]);
    const dialog = new AddPhotosDialog(page);

    await expect(dialog.problemOf(1)).toHaveText(
      'This isn’t a JPEG, PNG, WebP or HEIC photo, so it won’t be added.',
    );
    await expect(dialog.action).toHaveText('Add photos');
    await expect(dialog.action).toBeDisabled();
  });

  // L2-031 AC2: the server reads the file itself and has the last word
  test('marks a photo the server refuses, and adds the others', async ({ page }) => {
    albumOf(page).failUpload('bonfire.jpg', 'photo_type_not_allowed');
    await new PhotoAlbumPage(page).choose(theThree());
    const dialog = new AddPhotosDialog(page);

    await dialog.action.click();

    await expect(dialog.problemOf(2)).toContainText(
      'This isn’t a JPEG, PNG, WebP or HEIC photo, so it won’t be added.',
    );
    await expect(dialog.tryAgain(2)).toHaveCount(0);
    expect(albumOf(page).uploaded.map((sent) => sent.name)).toEqual(['lake.jpg', 'hike.jpg']);
  });

  // L2-031 AC1
  test('takes the first 20 of more and says so', async ({ page }) => {
    await new PhotoAlbumPage(page).choose(
      Array.from({ length: 22 }, (_, i) => aPhoto(`photo-${i}.jpg`, 'call1.jpg')),
    );
    const dialog = new AddPhotosDialog(page);

    await expect(dialog.rows).toHaveCount(20);
    await expect(dialog.notice).toContainText('You can add 20 photos at a time.');
    await expect(dialog.action).toHaveText('Add 20 photos');
  });

  // L2-031 AC3
  test('a caption accepts no more than 200 characters and shows a count', async ({ page }) => {
    await new PhotoAlbumPage(page).choose(theThree());
    const dialog = new AddPhotosDialog(page);

    await dialog.caption(1).pressSequentially('x'.repeat(10));
    await expect(dialog.countOf(1)).toHaveCount(0);

    await dialog.caption(1).fill('x'.repeat(199));
    await dialog.caption(1).pressSequentially('yyy');

    await expect(dialog.caption(1)).toHaveValue(`${'x'.repeat(199)}y`);
    await expect(dialog.countOf(1)).toHaveText('200 / 200');
  });

  // L2-031 AC5
  test('keeps a photo that failed with Try again; the others are in the album', async ({
    page,
  }) => {
    albumOf(page).failUpload('hike.jpg');
    const album = new PhotoAlbumPage(page);
    await album.choose(theThree());
    const dialog = new AddPhotosDialog(page);

    await dialog.action.click();

    await expect(dialog.outcome).toContainText('One photo didn’t upload.');
    await expect(dialog.outcome).toContainText('The other two are in the album.');
    await expect(dialog.problemOf(3)).toContainText('Didn’t upload.');
    await expect(dialog.tryAgain(3)).toBeVisible();
    await expect(dialog.stateOf(1)).toHaveText('Added');
    await expect(dialog.action).toHaveText('Done');
    await expect(album.thumbnails).toHaveCount(20);

    albumOf(page).uploadsRecover();
    await dialog.tryAgain(3).click();

    await expect(dialog.root).toHaveCount(0);
    await expect(album.thumbnails).toHaveCount(21);
  });

  // L2-031 AC5
  test('Done closes the dialog with the failed photo left out', async ({ page }) => {
    albumOf(page).failUpload('hike.jpg');
    const album = new PhotoAlbumPage(page);
    await album.choose(theThree());
    const dialog = new AddPhotosDialog(page);
    await dialog.action.click();
    await expect(dialog.action).toHaveText('Done');

    await dialog.action.click();

    await expect(dialog.root).toHaveCount(0);
    await expect(album.thumbnails).toHaveCount(20);
  });

  // L2-045 AC2
  test('stops and says so when the Popkin has wrapped up', async ({ page }) => {
    albumOf(page).failUpload('lake.jpg', 'popkin_wrapped_up');
    await new PhotoAlbumPage(page).choose(theThree());
    const dialog = new AddPhotosDialog(page);

    await dialog.action.click();

    await expect(dialog.outcome).toContainText('This Popkin has wrapped up.');
    expect(albumOf(page).uploaded).toEqual([]);
    await expect(dialog.tryAgain(1)).toHaveCount(0);
  });

  // L2-057 AC2
  test('Escape closes it and nothing is added', async ({ page }) => {
    const album = new PhotoAlbumPage(page);
    await album.choose(theThree());
    const dialog = new AddPhotosDialog(page);
    await expect(dialog.rows).toHaveCount(3);

    await page.keyboard.press('Escape');

    await expect(dialog.root).toHaveCount(0);
    expect(albumOf(page).uploaded).toEqual([]);
    await expect(album.thumbnails).toHaveCount(18);
  });

  test('the same photos can be chosen again after closing', async ({ page }) => {
    const album = new PhotoAlbumPage(page);
    await album.choose(theThree());
    const dialog = new AddPhotosDialog(page);
    await dialog.close.click();
    await expect(dialog.root).toHaveCount(0);

    await album.choose(theThree());

    await expect(dialog.rows).toHaveCount(3);
  });
});

// L2-058 AC4
test.describe('the Add photos dialog on a phone and on a wider screen', () => {
  for (const [width, height, sheet] of [
    [360, 780, true],
    [768, 1024, false],
  ] as const) {
    test(`is ${sheet ? 'a sheet from the bottom' : 'centred'} at ${width} px`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await theMockPhotos(page);
      await page.goto(albumUrl);
      await new PhotoAlbumPage(page).choose(theThree());
      const dialog = new AddPhotosDialog(page);

      await expect(dialog.rows).toHaveCount(3);
      // The sheet slides up; it has arrived when it rests on the bottom edge.
      await expect.poll(() => dialog.isSheet(height)).toBe(sheet);
    });
  }
});

test.describe('Add photos from an album with none', () => {
  // L2-032 AC5
  test('the first photo fills the empty album', async ({ page }) => {
    await theMockPhotos(page, (album) => album.empty());
    await page.goto(albumUrl);
    const album = new PhotoAlbumPage(page);
    await expect(album.addFirst).toBeVisible();

    await album.choose([aPhoto('lake.jpg')]);
    const dialog = new AddPhotosDialog(page);
    await expect(dialog.action).toHaveText('Add 1 photo');
    await dialog.action.click();

    await expect(dialog.root).toHaveCount(0);
    await expect(album.thumbnails).toHaveCount(1);
    await expect(album.thumbnail('Photo by Mara')).toBeVisible();
  });
});
