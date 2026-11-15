// Acceptance Test
// Traces to: L2-077 AC2, AC4, AC5
// Description: while Plan is off, the plan board opened by its address says "Plan is switched
// off" and offers "Back to {Popkin name}", showing no story; an open board turns to that within a
// minute, and back to what it held once the feature is on again.
import { homeUrl } from '../fixtures/home';
import { burnDownUrl, maraWithAPlan, planUrl } from '../fixtures/plan';
import { expect, test } from '../fixtures/pk-test';
import { BurnDownPage } from '../pages/burn-down.page';
import { PlanBoardPage } from '../pages/plan-board.page';
import { PopkinHomePage } from '../pages/popkin-home.page';

const offText =
  'Popkin has turned this feature off for now. Nothing is lost: it comes back as it was when the feature is on again. Your host can ask Popkin to find out more.';

const hostOffText =
  'Your host switched Plan off for this Popkin. Nothing is lost: it comes back as it was when they switch it on again in Popkin settings.';

test.describe('Plan switched off', () => {
  // L2-077 AC2
  test('the board opened by its address says so, shows no story, and goes back home', async ({
    page,
  }) => {
    const plan = await maraWithAPlan(page);
    plan.fail('off');
    await page.goto(planUrl);
    const board = new PlanBoardPage(page);

    await expect(board.off).toBeVisible();
    await expect(board.offText).toHaveText(offText);
    await expect(board.backToPopkin).toHaveText('Back to Cabin Week ’27');
    await board.backToPopkin.click();

    await expect(new PopkinHomePage(page).root).toBeVisible();
    await expect(page).toHaveURL(homeUrl);
  });

  // L2-077 AC4, AC5
  test('an open board turns to it within a minute, and comes back as it was', async ({ page }) => {
    const plan = await maraWithAPlan(page);
    await page.goto(planUrl);
    const board = new PlanBoardPage(page);
    await expect(board.root).toBeVisible();
    await expect(board.off).toHaveCount(0);

    plan.fail('off');
    await page.clock.runFor(60_000);
    await expect(board.off).toBeVisible();

    plan.recover();
    await page.clock.runFor(60_000);
    await expect(board.off).toHaveCount(0);
  });

  // L2-077 AC2, L2-153: the Host switched it off, so the Host can switch it on again.
  test('switched off by the Host, the board says the Host can switch it on again', async ({
    page,
  }) => {
    const plan = await maraWithAPlan(page);
    plan.fail('host-off');
    await page.goto(planUrl);
    const board = new PlanBoardPage(page);

    await expect(board.off).toBeVisible();
    await expect(board.offText).toHaveText(hostOffText);
  });

  test('switched off by the Host, the burn-down says the same', async ({ page }) => {
    const plan = await maraWithAPlan(page);
    plan.fail('host-off');
    await page.goto(burnDownUrl);

    await expect(new BurnDownPage(page).offText).toHaveText(hostOffText);
  });
});
