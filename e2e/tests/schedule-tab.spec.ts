// Acceptance Test
// Traces to: L2-072 AC1, L2-077 AC1
// Description: the Schedule tab shows between Chat and Photos while Schedules is on, and is not
// there while it is off.
import { homeNow, homeUrl, maraAtHome } from '../fixtures/home';
import { popkinId } from '../fixtures/chat';
import { Schedule } from '../fixtures/schedule';
import { expect, test } from '../fixtures/pk-test';
import { PopkinHomePage } from '../pages/popkin-home.page';

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: homeNow });
});

test.describe('the Schedule tab', () => {
  test.use({ viewport: { width: 820, height: 900 } });

  // L2-072 AC1
  test('is between Chat and Photos and opens time off while Schedules is on', async ({ page }) => {
    await maraAtHome(page, (home) => (home.popkin.schedules = true));
    // Nobody has hours yet: the home asks for its Schedule section and leaves it out.
    await new Schedule(page).install();
    await page.goto(homeUrl);
    const home = new PopkinHomePage(page);

    await expect(home.tabs).toHaveText(['Home', 'Chat', 'Schedule', 'Photos', 'Experiences']);
    await expect(home.scheduleTab).toHaveAttribute('href', `/p/${popkinId}/schedule`);
  });

  // L2-077 AC1
  test('is not there while Schedules is off', async ({ page }) => {
    await maraAtHome(page, (home) => (home.popkin.schedules = false));
    await page.goto(homeUrl);
    const home = new PopkinHomePage(page);

    await expect(home.tabs).toHaveText(['Home', 'Chat', 'Photos', 'Experiences']);
    await expect(home.scheduleTab).toHaveCount(0);
  });
});
