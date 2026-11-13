import { chatUrl } from '../fixtures/chat';
import { experiencesUrl, maraWithExperiences } from '../fixtures/experiences';
import { type Home, homeUrl, maraAtHome } from '../fixtures/home';
import { albumUrl, maraInTheAlbum } from '../fixtures/photos';
import { expect, test } from '../fixtures/pk-test';
import { PopkinHomePage } from '../pages/popkin-home.page';
import { WrapUpBanner } from '../pages/wrap-up-banner';

/** Lakeside Weekend wraps up on Sunday 13 September 2026 at 6 pm. */
const sunday = (hour: number, minute: number, second = 0) =>
  new Date(2026, 8, 13, hour, minute, second);
const asMember = (home: Home) => {
  home.popkin = { ...home.popkin, viewerRole: 'Member' };
};

// L2-044 AC2
test.describe('The last hour of a Popkin', () => {
  test('is not announced with more than an hour left', async ({ page }) => {
    await page.clock.install({ time: sunday(16, 30) });
    await maraAtHome(page);
    await page.goto(homeUrl);

    await expect(new PopkinHomePage(page).heading).toBeVisible();
    await expect(new WrapUpBanner(page).root).toHaveCount(0);
  });

  test('is announced on the home once an hour is left, without a reload', async ({ page }) => {
    await page.clock.install({ time: sunday(16, 59) });
    await maraAtHome(page, asMember);
    await page.goto(homeUrl);
    const banner = new WrapUpBanner(page);
    await expect(new PopkinHomePage(page).heading).toBeVisible();
    await expect(banner.root).toHaveCount(0);

    await page.clock.runFor(60_000);

    await expect(banner.lead).toHaveText('1 hour left.');
    await expect(banner.text).toContainText('Lakeside Weekend wraps up at 6 pm.');
  });

  test('says how long is left under the hour', async ({ page }) => {
    await page.clock.install({ time: sunday(17, 17, 30) });
    await maraAtHome(page, asMember);

    await page.goto(homeUrl);

    await expect(new WrapUpBanner(page).lead).toHaveText('42 min left.');
  });

  test('stays away once dismissed, on the other screens of the Popkin too', async ({ page }) => {
    await page.clock.install({ time: sunday(17, 17, 30) });
    await maraInTheAlbum(page);
    await page.goto(homeUrl);
    const banner = new WrapUpBanner(page);

    await banner.dismiss.click();

    await expect(banner.root).toHaveCount(0);
    await new PopkinHomePage(page).tab('Photos').click();
    await expect(page).toHaveURL(albumUrl);
    await expect(banner.root).toHaveCount(0);
  });

  for (const [screen, url, arrange] of [
    ['the Everyone thread', chatUrl, maraAtHome],
    ['Photos', albumUrl, maraInTheAlbum],
    ['Experiences', experiencesUrl, maraWithExperiences],
  ] as const) {
    test(`is announced in ${screen}`, async ({ page }) => {
      await page.clock.install({ time: sunday(17, 17, 30) });
      await arrange(page);

      await page.goto(url);

      await expect(new WrapUpBanner(page).lead).toHaveText('42 min left.');
    });
  }

  // L2-044 AC3
  test('never comes for a Popkin that keeps going', async ({ page }) => {
    await page.clock.install({ time: sunday(17, 17, 30) });
    await maraAtHome(page, (home) => {
      home.popkin = { ...home.popkin, endsAt: null };
    });
    await page.goto(homeUrl);

    await expect(new PopkinHomePage(page).heading).toBeVisible();
    await expect(new WrapUpBanner(page).root).toHaveCount(0);
  });
});
