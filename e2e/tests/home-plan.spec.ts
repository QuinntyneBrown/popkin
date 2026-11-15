// Acceptance Test
// Traces to: L2-075 AC1, AC3, L2-077 AC6, L2-068 AC12, L2-056
// Description: with Plan on and a story made, the Popkin home's "Plan" section says the points
// left and how far behind or ahead, and lists the three biggest open stories; "See all" opens
// the plan board. With no story, or with Plan off, the section is not there.
import { popkinId } from '../fixtures/chat';
import { homeUrl } from '../fixtures/home';
import { maraWithAPlan, planOf } from '../fixtures/plan';
import { expect, test } from '../fixtures/pk-test';
import { PlanBoardPage } from '../pages/plan-board.page';
import { PopkinHomePage } from '../pages/popkin-home.page';

test.describe('the home’s Plan section', () => {
  // L2-075 AC1
  test('says the points left and how far behind, lists the biggest open, and opens the board', async ({
    page,
  }) => {
    await maraWithAPlan(page);
    await page.goto(homeUrl);
    const home = new PopkinHomePage(page);

    await expect(home.planHeadline).toHaveText('24 pts left');
    await expect(home.planStatus).toHaveText('7 behind');
    await expect(home.planBiggest).toHaveText([
      /Book the cabin at Pine Hollow/,
      /Rent a 7-seat van/,
      /Grocery list for three dinners/,
    ]);
    await expect(home.planBiggest.first().getByRole('img')).toHaveAccessibleName('Mara');
    await home.planSeeAll.click();

    await expect(new PlanBoardPage(page).root).toBeAttached();
  });

  // L2-075 AC3
  test('is not there before the first story', async ({ page }) => {
    await maraWithAPlan(page, (plan) => {
      plan.stories = [];
      plan.sprint = null;
      plan.progress = null;
    });
    await page.goto(homeUrl);
    const home = new PopkinHomePage(page);

    await expect(home.members).toBeVisible();
    await expect.poll(() => planOf(page).summaryReads).toBeGreaterThanOrEqual(1);
    await expect(home.plan).toHaveCount(0);
  });

  // L2-075 AC3, L2-077 AC6
  test('is not there while Plan is off, and the summary is not asked for', async ({ page }) => {
    const plan = await maraWithAPlan(page, (_, home) => (home.popkin.plan = false));
    await page.goto(homeUrl);
    const home = new PopkinHomePage(page);

    await expect(home.members).toBeVisible();
    await expect(home.plan).toHaveCount(0);
    expect(plan.summaryReads).toBe(0);
  });

  // L2-056
  test('says the plan did not load, and tries again', async ({ page, hub }) => {
    const plan = await maraWithAPlan(page);
    plan.fail();
    await page.goto(homeUrl);
    const home = new PopkinHomePage(page);

    await expect(home.failureOf(home.plan)).toContainText('The plan didn’t load.');
    // The hub's connection reads the home again; let that read fail too before the plan recovers.
    await hub.connected();
    await expect.poll(() => plan.summaryReads).toBeGreaterThanOrEqual(2);
    plan.recover();
    await home.tryAgainIn(home.plan).click();

    await expect(home.planHeadline).toHaveText('24 pts left');
  });

  // L2-068 AC12
  test('reads the plan again when it changes', async ({ page, hub }) => {
    const plan = await maraWithAPlan(page);
    await page.goto(homeUrl);
    const home = new PopkinHomePage(page);
    await expect(home.planHeadline).toHaveText('24 pts left');
    await hub.connected();

    plan.burn = { ...plan.burn, pointsLeft: 16, behind: -1 };
    await hub.push('PlanChanged', popkinId, 2);

    await expect(home.planHeadline).toHaveText('16 pts left');
    await expect(home.planStatus).toHaveText('1 ahead');
  });
});
