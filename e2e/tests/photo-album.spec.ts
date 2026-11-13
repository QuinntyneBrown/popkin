import { people } from '../fixtures/chat';
import { homeUrl } from '../fixtures/home';
import {
  aLongAlbum,
  albumOf,
  albumUrl,
  someoneAddsAPhoto,
  theMockPhotos,
} from '../fixtures/photos';
import { expect, test } from '../fixtures/pk-test';
import { NotFoundPage } from '../pages/not-found.page';
import { PhotoAlbumPage } from '../pages/photo-album.page';
import { PopkinHomePage } from '../pages/popkin-home.page';

test.describe('Photos', () => {
  // L2-032 AC1
  test('shows how many photos from how many people, grouped by day, the latest first', async ({
    page,
  }) => {
    await theMockPhotos(page);
    await page.goto(albumUrl);
    const album = new PhotoAlbumPage(page);

    await expect(album.root).toBeVisible();
    await expect(album.heading).toHaveText('Photos');
    await expect(album.summary).toContainText('48 photos from 11 people');
    await expect(album.days).toHaveText(['Saturday', 'Friday']);
    await expect(album.thumbnails).toHaveCount(18);
    expect((await album.photosOf('Saturday'))[0]).toBe(
      'First light on the dock. Worth the 6 am alarm.',
    );
    await expect(album.currentTab).toHaveText(/Photos/);
    await expect(album.screen).toHaveAttribute('data-accent', 'teal');
  });

  // L2-032 AC7
  test('names a thumbnail by its caption, or by who added it when it has none', async ({
    page,
  }) => {
    await theMockPhotos(page, (album) => {
      album.shots[1] = { ...album.shots[1], caption: null };
    });
    await page.goto(albumUrl);
    const album = new PhotoAlbumPage(page);

    await expect(album.thumbnail('Lunch on the lawn')).toBeVisible();
    await expect(album.thumbnail('Photo by Walt')).toBeVisible();
  });

  // L2-032 AC1, L2-058 AC7
  for (const [width, across] of [
    [360, 3],
    [640, 4],
    [1024, 5],
    [1280, 6],
  ] as const) {
    test(`is ${across} photos across at ${width} px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await theMockPhotos(page, (album) => (album.shots = aLongAlbum(40)));
      await page.goto(albumUrl);
      const album = new PhotoAlbumPage(page);

      await expect(album.thumbnails).toHaveCount(40);
      expect(await album.across()).toBe(across);
    });
  }

  // L2-032 AC2
  test('the first photo of the latest day is twice the width and height of the others', async ({
    page,
  }) => {
    await theMockPhotos(page);
    await page.goto(albumUrl);
    const album = new PhotoAlbumPage(page);

    await expect(album.thumbnails.first()).toBeVisible();
    const scale = await album.featureScale();
    expect(scale.width).toBeCloseTo(2, 0);
    expect(scale.height).toBeCloseTo(2, 0);
  });

  test('shows skeletons and says "Loading photos…" until the album answers', async ({ page }) => {
    let release: () => void = () => undefined;
    await theMockPhotos(page, (album) => (release = album.hold('album')));
    await page.goto(albumUrl);
    const album = new PhotoAlbumPage(page);

    await expect(album.loading).toHaveText('Loading photos…');
    await expect(album.skeletons.first()).toBeVisible();
    await expect(album.thumbnails).toHaveCount(0);

    release();
    await expect(album.thumbnails).toHaveCount(18);
    await expect(album.skeletons).toHaveCount(0);
  });

  // L2-032 AC5
  test('explains the album and offers "Add photos" when there are none', async ({ page }) => {
    await theMockPhotos(page, (album) => album.empty());
    await page.goto(albumUrl);
    const album = new PhotoAlbumPage(page);

    await expect(album.emptyHeading).toHaveText('No photos yet');
    await expect(album.empty).toContainText(
      'This is the album everyone shares. Add the first one and the rest will follow.',
    );
    await expect(album.addFirst).toBeVisible();
    await expect(album.filters).toHaveCount(0);
  });

  // L2-056 AC2
  test('says "We couldn’t load the photos" with Try again, which loads them', async ({ page }) => {
    await theMockPhotos(page, (album) => album.fail('album'));
    await page.goto(albumUrl);
    const album = new PhotoAlbumPage(page);

    await expect(album.error).toContainText('We couldn’t load the photos');
    await expect(album.error).toContainText('They’re safe. Check your connection and try again.');

    albumOf(page).recover('album');
    await album.tryAgain.click();
    await expect(album.thumbnails).toHaveCount(18);
  });

  // L2-051 AC1
  test('is not found for someone who is not a member', async ({ page }) => {
    await theMockPhotos(page);
    await page.route('**/api/popkins/*/photos?*', (route) =>
      route.fulfill({ status: 404, json: { status: 404, code: 'popkin_not_found' } }),
    );
    await page.goto(albumUrl);

    await expect(new NotFoundPage(page).root).toBeVisible();
  });

  test('opens from the Photos tab of the home', async ({ page }) => {
    await theMockPhotos(page);
    await page.goto(homeUrl);
    await new PopkinHomePage(page).nav.getByRole('link', { name: 'Photos' }).click();

    await expect(new PhotoAlbumPage(page).thumbnails).toHaveCount(18);
  });
});

test.describe('the filters of Photos', () => {
  // L2-032 AC3
  test('Mine shows only the member’s photos, marked as pressed, and Everyone shows all again', async ({
    page,
  }) => {
    await theMockPhotos(page);
    await page.goto(albumUrl);
    const album = new PhotoAlbumPage(page);
    await expect(album.everyone).toHaveAttribute('aria-pressed', 'true');
    await expect(album.mine).toHaveAttribute('aria-pressed', 'false');

    await album.mine.click();

    await expect(album.mine).toHaveAttribute('aria-pressed', 'true');
    await expect(album.everyone).toHaveAttribute('aria-pressed', 'false');
    await expect(album.thumbnails).toHaveCount(1);
    await expect(album.days).toHaveText(['Saturday']);
    await expect(album.summary).toContainText('48 photos from 11 people');
    expect((await album.featureScale().catch(() => null)) ?? null).toBeNull();

    await album.everyone.click();
    await expect(album.thumbnails).toHaveCount(18);
    await expect(album.everyone).toHaveAttribute('aria-pressed', 'true');
  });

  // L2-032 AC4
  test('Mine with none says so, offers "Add photos" and shows everyone’s again', async ({
    page,
  }) => {
    await theMockPhotos(page, (album) => {
      album.shots = album.shots.map((s) => (s.by === people.mara ? { ...s, by: people.walt } : s));
    });
    await page.goto(albumUrl);
    const album = new PhotoAlbumPage(page);

    await album.mine.click();

    await expect(album.emptyHeading).toHaveText('You haven’t added any yet');
    await expect(album.empty).toContainText(
      'Photos you add show up here, and in the album everyone sees.',
    );
    await expect(album.addFirst).toBeVisible();
    await expect(album.mine).toHaveAttribute('aria-pressed', 'true');

    await album.showEveryones.click();
    await expect(album.thumbnails).toHaveCount(18);
  });

  test('the filters work from the keyboard', async ({ page }) => {
    await theMockPhotos(page);
    await page.goto(albumUrl);
    const album = new PhotoAlbumPage(page);
    await expect(album.thumbnails).toHaveCount(18);

    await album.mine.focus();
    await page.keyboard.press('Enter');

    await expect(album.thumbnails).toHaveCount(1);
  });
});

// L2-032 AC6
test.describe('an album of more than 60 photos', () => {
  test('opens with the latest 60 and loads more as the member scrolls', async ({ page }) => {
    await theMockPhotos(page, (album) => {
      album.shots = aLongAlbum(130);
      album.photoCount = 130;
    });
    await page.goto(albumUrl);
    const album = new PhotoAlbumPage(page);

    await expect(album.thumbnails).toHaveCount(60);
    await expect(album.thumbnail('Photo 130')).toBeVisible();

    await album.toTheEnd();
    await expect(album.thumbnails).toHaveCount(120);

    await album.toTheEnd();
    await expect(album.thumbnails).toHaveCount(130);
    expect(albumOf(page).asked.filter((asked) => asked.cursor).length).toBe(2);
  });

  test('keeps what is shown when more do not load, and Try again loads them', async ({ page }) => {
    await theMockPhotos(page, (album) => {
      album.shots = aLongAlbum(70);
      album.fail('more');
    });
    await page.goto(albumUrl);
    const album = new PhotoAlbumPage(page);
    await expect(album.thumbnails).toHaveCount(60);

    await album.toTheEnd();
    await expect(album.moreFailed).toContainText('More photos didn’t load.');
    await expect(album.thumbnails).toHaveCount(60);

    albumOf(page).recover('more');
    await album.tryMoreAgain.click();
    await expect(album.thumbnails).toHaveCount(70);
    await expect(album.moreFailed).toHaveCount(0);
  });
});

// L2-031 AC7
test.describe('photos added by others', () => {
  test('appear without a reload, first under their day, with the count', async ({ page, hub }) => {
    await theMockPhotos(page);
    await page.goto(albumUrl);
    const album = new PhotoAlbumPage(page);
    await expect(album.thumbnails).toHaveCount(18);
    await hub.connected();
    // Once connected the album reads itself again; the new photo comes after that.
    await expect.poll(() => albumOf(page).asked.length).toBe(2);

    await someoneAddsAPhoto(page, 'Canoe race');

    await expect(album.thumbnails).toHaveCount(19);
    expect((await album.photosOf('Saturday'))[0]).toBe('Canoe race');
    await expect(album.summary).toContainText('49 photos from 11 people');
  });

  test('fill an album that was empty', async ({ page, hub }) => {
    await theMockPhotos(page, (album) => album.empty());
    await page.goto(albumUrl);
    const album = new PhotoAlbumPage(page);
    await expect(album.emptyHeading).toHaveText('No photos yet');
    await hub.connected();
    await expect.poll(() => albumOf(page).asked.length).toBe(2);

    await someoneAddsAPhoto(page, 'Canoe race');

    await expect(album.thumbnail('Canoe race')).toBeVisible();
    await expect(album.empty).toHaveCount(0);
  });
});

// L2-058 AC9
test.describe('Add photos on a phone and on a wider screen', () => {
  test('is a floating action on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await theMockPhotos(page);
    await page.goto(albumUrl);
    const album = new PhotoAlbumPage(page);

    await expect(album.addFloating).toBeVisible();
    await expect(album.addFloating).toHaveAccessibleName('Add photos');
    await expect(album.addInHeader).toBeHidden();
  });

  test('is a button in the header from 768 px', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await theMockPhotos(page);
    await page.goto(albumUrl);
    const album = new PhotoAlbumPage(page);

    await expect(album.addInHeader).toBeVisible();
    await expect(album.addFloating).toBeHidden();
  });

  // L2-045 AC3
  test('is not offered once the Popkin has wrapped up', async ({ page }) => {
    await theMockPhotos(page, (album) => (album.canAdd = false));
    await page.goto(albumUrl);
    const album = new PhotoAlbumPage(page);

    await expect(album.thumbnails).toHaveCount(18);
    await expect(album.addFloating).toHaveCount(0);
    await expect(album.addInHeader).toHaveCount(0);
  });
});
