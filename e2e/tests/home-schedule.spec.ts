// Acceptance Test
// Traces to: L2-075 AC2, AC3, L2-077 AC6
// Description: with Schedules on and hours entered, the Popkin home's "Schedule" section names
// the next evening everyone is free, or says no evening this week is; "See all" opens this week.
// With no hours, or with Schedules off, the section is not there.
import { homeUrl, maraAtHome } from '../fixtures/home';
import {
  maraThisWeek,
  theHomeWithNoEveningFree,
  theMocksHours,
  thisWeekNow,
  thisWeekUrl,
} from '../fixtures/schedule';
import { expect, test } from '../fixtures/pk-test';
import { PopkinHomePage } from '../pages/popkin-home.page';
import { ThisWeekPage } from '../pages/this-week.page';

test.describe('the home’s Schedule section', () => {
  // L2-075 AC2
  test('names the next evening everyone is free, and "See all" opens this week', async ({
    page,
  }) => {
    await maraThisWeek(page, theMocksHours);
    await page.goto(homeUrl);
    const home = new PopkinHomePage(page);

    await expect(home.scheduleLine).toHaveText('Everyone’s free Wednesday from 7:30 pm');
    await home.scheduleSeeAll.click();

    await expect(new ThisWeekPage(page).root).toBeVisible();
    await expect(page).toHaveURL(thisWeekUrl);
  });

  // L2-075 AC2
  test('says when no evening this week is free for everyone', async ({ page }) => {
    await theHomeWithNoEveningFree(page);
    await page.goto(homeUrl);

    await expect(new PopkinHomePage(page).scheduleLine).toHaveText(
      'No evening this week is free for everyone',
    );
  });

  // L2-075 AC3
  test('is not there while nobody has added their hours', async ({ page }) => {
    await maraThisWeek(page);
    await page.goto(homeUrl);
    const home = new PopkinHomePage(page);

    await expect(home.members).toBeVisible();
    await expect(home.schedule).toHaveCount(0);
  });

  // L2-075 AC3, L2-077 AC6
  test('is not there while Schedules is off, and the summary is not asked for', async ({
    page,
  }) => {
    await page.clock.install({ time: thisWeekNow });
    await maraAtHome(page, (home) => (home.popkin.schedules = false));
    const asked: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/schedule/')) asked.push(request.url());
    });
    await page.goto(homeUrl);
    const home = new PopkinHomePage(page);

    await expect(home.members).toBeVisible();
    await expect(home.schedule).toHaveCount(0);
    expect(asked).toEqual([]);
  });
});
