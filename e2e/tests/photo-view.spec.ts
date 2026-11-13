import { homeUrl } from '../fixtures/home';
import {
  aLongAlbum,
  albumOf,
  albumUrl,
  photoUrl,
  theMockAlbum,
  theMockPhotos,
} from '../fixtures/photos';
import { expect, test } from '../fixtures/pk-test';
import { NotFoundPage } from '../pages/not-found.page';
import { PhotoAlbumPage } from '../pages/photo-album.page';
import { PhotoViewPage } from '../pages/photo-view.page';
import { PopkinHomePage } from '../pages/popkin-home.page';

const [lake, bonfire, hike] = theMockAlbum();

test.describe('a photo, full screen', () => {
  // L2-033 AC1
  test('shows who added it and when, the whole photo and its caption', async ({ page }) => {
    await theMockPhotos(page);
    await page.goto(albumUrl);
    await new PhotoAlbumPage(page)
      .thumbnail('First light on the dock. Worth the 6 am alarm.')
      .click();
    const view = new PhotoViewPage(page);

    await expect(view.root).toBeVisible();
    await expect(page).toHaveURL(photoUrl(lake.id));
    await expect(view.name).toHaveText('Mara Okafor');
    await expect(view.time).toHaveText('Saturday, 7:02 am');
    await expect(view.caption).toHaveText('First light on the dock. Worth the 6 am alarm.');
    await expect(view.photo).toHaveAccessibleName('First light on the dock. Worth the 6 am alarm.');
    expect(await view.showsTheWholePhoto()).toBe(true);
    await expect(view.screen).toHaveAttribute('data-accent', 'teal');
  });

  // L2-033 AC1: reactions and comments arrive with journey 14; until then there are none to show
  test('shows no reactions or comments while a photo has none', async ({ page }) => {
    await theMockPhotos(page);
    await page.goto(photoUrl(lake.id));
    const view = new PhotoViewPage(page);

    await expect(view.caption).toBeVisible();
    await expect(view.reactions).toHaveCount(0);
    await expect(view.comments).toHaveCount(0);
  });

  test('a photo without a caption is named by who added it', async ({ page }) => {
    await theMockPhotos(page, (album) => {
      album.shots[1] = { ...album.shots[1], caption: null };
    });
    await page.goto(photoUrl(bonfire.id));
    const view = new PhotoViewPage(page);

    await expect(view.photo).toHaveAccessibleName('Photo by Walt');
    await expect(view.name).toHaveText('Walt Brennan');
  });

  test('says "Loading photo…" until it answers', async ({ page }) => {
    let release: () => void = () => undefined;
    await theMockPhotos(page, (album) => (release = album.hold('photo')));
    await page.goto(photoUrl(lake.id));
    const view = new PhotoViewPage(page);

    await expect(view.loading).toContainText('Loading photo…');

    release();
    await expect(view.caption).toHaveText('First light on the dock. Worth the 6 am alarm.');
  });

  // L2-033 AC4
  test('says "This photo didn’t load" with Try again when the photo does not answer', async ({
    page,
  }) => {
    await theMockPhotos(page, (album) => album.fail('photo'));
    await page.goto(photoUrl(lake.id));
    const view = new PhotoViewPage(page);

    await expect(view.errorHeading).toHaveText('This photo didn’t load');
    await expect(view.error).toContainText('Check your connection and try again.');

    albumOf(page).recover('photo');
    await view.tryAgain.click();
    await expect(view.photo).toBeVisible();
  });

  // L2-033 AC4: an address expires; Try again asks for the photo, and so its address, again
  test('says so when the image itself does not arrive, and Try again shows it', async ({
    page,
  }) => {
    await theMockPhotos(page, (album) => album.breakImages());
    await page.goto(photoUrl(lake.id));
    const view = new PhotoViewPage(page);

    await expect(view.errorHeading).toHaveText('This photo didn’t load');
    await expect(view.name).toHaveText('Mara Okafor');

    albumOf(page).mendImages();
    await view.tryAgain.click();
    await expect(view.photo).toBeVisible();
    await expect(view.error).toHaveCount(0);
  });

  // L2-051
  test('is not found for a photo that is not in the Popkin', async ({ page }) => {
    await theMockPhotos(page);
    await page.goto(photoUrl('00000000-0000-4000-a000-999999999999'));

    await expect(new NotFoundPage(page).root).toBeVisible();
  });
});

// L2-033 AC3
test.describe('the previous and the next photo', () => {
  test.beforeEach(async ({ page }) => {
    await theMockPhotos(page);
    await page.goto(photoUrl(bonfire.id));
    await expect(new PhotoViewPage(page).caption).toHaveText(bonfire.caption ?? '');
  });

  test('the right arrow key opens the next photo, the left one the previous', async ({ page }) => {
    const view = new PhotoViewPage(page);

    await page.keyboard.press('ArrowRight');
    await expect(view.caption).toHaveText(hike.caption ?? '');
    await expect(page).toHaveURL(photoUrl(hike.id));

    await page.keyboard.press('ArrowLeft');
    await expect(view.caption).toHaveText(bonfire.caption ?? '');
    await page.keyboard.press('ArrowLeft');
    await expect(view.caption).toHaveText(lake.caption ?? '');
    await expect(page).toHaveURL(photoUrl(lake.id));
  });

  test('a swipe to the left opens the next photo, to the right the previous', async ({ page }) => {
    const view = new PhotoViewPage(page);

    await view.swipe('left');
    await expect(view.caption).toHaveText(hike.caption ?? '');

    await view.swipe('right');
    await expect(view.caption).toHaveText(bonfire.caption ?? '');
  });

  test('the latest photo has no previous one', async ({ page }) => {
    const view = new PhotoViewPage(page);
    await page.keyboard.press('ArrowLeft');
    await expect(view.caption).toHaveText(lake.caption ?? '');

    await page.keyboard.press('ArrowLeft');

    await expect(view.caption).toHaveText(lake.caption ?? '');
    await expect(page).toHaveURL(photoUrl(lake.id));
  });
});

// L2-033 AC2
test.describe('closing a photo', () => {
  test('Close returns to the album at the place the member left', async ({ page }) => {
    await theMockPhotos(page, (album) => (album.shots = aLongAlbum(130)));
    await page.goto(albumUrl);
    const album = new PhotoAlbumPage(page);
    await album.toTheEnd();
    await expect(album.thumbnails).toHaveCount(120);
    await album.thumbnail('Photo 60').scrollIntoViewIfNeeded();
    await album.thumbnail('Photo 60').click();
    const view = new PhotoViewPage(page);
    await expect(view.caption).toHaveText('Photo 60');

    await view.close.click();

    await expect(page).toHaveURL(albumUrl);
    await expect(album.thumbnails).toHaveCount(120);
    await expect(album.thumbnail('Photo 60')).toBeInViewport();
  });

  test('Escape closes it too, past every photo seen', async ({ page }) => {
    await theMockPhotos(page);
    await page.goto(albumUrl);
    const album = new PhotoAlbumPage(page);
    await album.thumbnail('Marshmallow technique: still debated.').click();
    const view = new PhotoViewPage(page);
    await expect(view.caption).toHaveText(bonfire.caption ?? '');
    await page.keyboard.press('ArrowRight');
    await expect(view.caption).toHaveText(hike.caption ?? '');

    await page.keyboard.press('Escape');

    await expect(page).toHaveURL(albumUrl);
    await expect(album.thumbnails).toHaveCount(18);
  });

  test('a photo opened from the home closes back to the home', async ({ page }) => {
    await theMockPhotos(page);
    await page.goto(homeUrl);
    await new PopkinHomePage(page).thumbnails.first().click();
    const view = new PhotoViewPage(page);
    await expect(view.root).toBeVisible();

    await view.close.click();

    await expect(page).toHaveURL(homeUrl);
  });

  test('a photo opened by its address closes to the album', async ({ page }) => {
    await theMockPhotos(page);
    await page.goto(photoUrl(lake.id));
    const view = new PhotoViewPage(page);
    await expect(view.caption).toBeVisible();

    await view.close.click();

    await expect(page).toHaveURL(albumUrl);
    await expect(new PhotoAlbumPage(page).thumbnails).toHaveCount(18);
  });
});

// L2-058 AC11
test.describe('the photo view on a phone and on a wider screen', () => {
  test('on a phone the author is in the bar over the photo', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await theMockPhotos(page);
    await page.goto(photoUrl(lake.id));
    const view = new PhotoViewPage(page);

    await expect(view.name).toBeVisible();
    await expect(view.panelBy).toBeHidden();
    await expect(view.caption).toBeVisible();
  });

  test('from 1024 px the author and the caption are in a panel beside the photo', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await theMockPhotos(page);
    await page.goto(photoUrl(lake.id));
    const view = new PhotoViewPage(page);

    await expect(view.panelBy).toBeVisible();
    await expect(view.panelBy).toContainText('Mara Okafor');
    await expect(view.caption).toBeVisible();
    expect(await view.authorIsBeside()).toBe(true);
  });
});
