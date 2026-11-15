// Acceptance Test
// Traces to: L2-068 AC1, L2-072 AC1, L2-077 AC1
// Description: the Plan tab shows between Chat and Schedule while Plan is on and opens the plan
// board, and is not there while it is off.
import { homeUrl } from '../fixtures/home';
import { maraWithAPlan, planUrl } from '../fixtures/plan';
import { expect, test } from '../fixtures/pk-test';
import { PlanBoardPage } from '../pages/plan-board.page';
import { PopkinHomePage } from '../pages/popkin-home.page';

test.describe('the Plan tab', () => {
  test.use({ viewport: { width: 820, height: 900 } });

  // L2-068 AC1, L2-072 AC1
  test('is between Chat and Schedule and opens the plan board while Plan is on', async ({
    page,
  }) => {
    await maraWithAPlan(page);
    await page.goto(homeUrl);
    const home = new PopkinHomePage(page);

    await expect(home.tabs).toHaveText([
      'Home',
      'Chat',
      'Plan',
      'Schedule',
      'Photos',
      'Experiences',
    ]);
    await home.planTab.click();

    const board = new PlanBoardPage(page);
    await expect(board.root).toBeVisible();
    await expect(page).toHaveURL(planUrl);
    await expect(board.currentTab).toHaveText('Plan');
  });

  // L2-068 AC1: with Schedules off, Plan follows Chat and Photos follows it.
  test('is between Chat and Photos while Schedules is off', async ({ page }) => {
    await maraWithAPlan(page, (_, home) => (home.popkin.schedules = false));
    await page.goto(homeUrl);

    await expect(new PopkinHomePage(page).tabs).toHaveText([
      'Home',
      'Chat',
      'Plan',
      'Photos',
      'Experiences',
    ]);
  });

  // L2-077 AC1
  test('is not there while Plan is off', async ({ page }) => {
    await maraWithAPlan(page, (_, home) => (home.popkin.plan = false));
    await page.goto(homeUrl);
    const home = new PopkinHomePage(page);

    await expect(home.tabs).toHaveText(['Home', 'Chat', 'Schedule', 'Photos', 'Experiences']);
    await expect(home.planTab).toHaveCount(0);
  });
});
