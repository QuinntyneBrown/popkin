// Acceptance Test
// Traces to: L2-071 AC1 to AC8, L2-068 AC12, L2-077 AC2
// Description: the burn-down says how far behind or ahead the plan is and when it will finish,
// draws the points left by day with its text for assistive technology, lists the biggest open
// stories beside or under the chart, and says when there is nothing to burn down yet.
import { popkinId } from '../fixtures/chat';
import { expect, test } from '../fixtures/pk-test';
import {
  burnDownUrl,
  maraWithAPlan,
  planOf,
  planUrl,
  thePlanBurnedDown,
  thePlanEmpty,
  thePlanFailing,
  thePlanOff,
} from '../fixtures/plan';
import { BurnDownPage } from '../pages/burn-down.page';
import { NewStoryDialog } from '../pages/new-story.dialog';
import { PlanBoardPage } from '../pages/plan-board.page';

test.describe('the burn-down', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  // L2-071 AC1
  test('opens from the board’s "Burn-down", titled with the sprint’s days', async ({ page }) => {
    await maraWithAPlan(page);
    await page.goto(planUrl);

    await new PlanBoardPage(page).burnDownView.click();

    const burnDown = new BurnDownPage(page);
    await expect(burnDown.root).toBeAttached();
    await expect(burnDown.currentView).toHaveText('Burn-down');
    await expect(burnDown.heading).toBeVisible();
    await expect(burnDown.sub).toHaveText('Aug 30 – Sep 26');
    await expect(burnDown.currentTab).toHaveAccessibleName(/Plan/);
  });

  // L2-071 AC2, AC3
  test('says the points left, how far behind, and when the plan will finish', async ({ page }) => {
    await maraWithAPlan(page);
    await page.goto(burnDownUrl);
    const burnDown = new BurnDownPage(page);

    await expect(burnDown.headline).toHaveText('24 pts left');
    await expect(burnDown.badge).toHaveText('7 behind');
    await expect(burnDown.forecast).toHaveText('Finishes Sep 30 · 4 days late');
  });

  // L2-071 AC4, AC5
  test('draws the points left by day, and gives them as text', async ({ page }) => {
    await maraWithAPlan(page);
    await page.goto(burnDownUrl);
    const burnDown = new BurnDownPage(page);

    await expect(burnDown.chartText).toHaveText(
      '24 points left, 7 behind. Finishes Sep 30, 4 days late. Points left at the end of each day: ' +
        'Aug 30: 32, Aug 31: 32, Sep 1: 32, Sep 2: 29, Sep 3: 29, Sep 4: 28, Sep 5: 28, Sep 6: 28, ' +
        'Sep 7: 31, Sep 8: 29, Sep 9: 29, Sep 10: 27, Sep 11: 26, Sep 12: 24.',
    );
    await expect(burnDown.todayLabel).toHaveText('24 left');
    await expect(burnDown.afterLabel).toHaveText('After the sprint');
    await expect(burnDown.xLabels).toHaveText(['Aug 30', 'Sep 6', 'Today', 'Sep 20', 'Sep 26']);
    await expect(burnDown.legendKeys).toHaveText([
      'Points left',
      'Ideal line',
      'At this week’s pace',
    ]);
  });

  // L2-071 AC6
  test('lists the three biggest open stories with their points and owners', async ({ page }) => {
    await maraWithAPlan(page);
    await page.goto(burnDownUrl);
    const burnDown = new BurnDownPage(page);

    await expect(burnDown.biggest.getByRole('heading', { level: 2 })).toHaveText('Biggest open');
    await expect(burnDown.biggestItems).toHaveCount(3);
    const first = burnDown.biggestItem(0);
    await expect(first.points).toHaveAccessibleName('8 points');
    await expect(first.title).toHaveText('Book the cabin at Pine Hollow');
    await expect(first.owner).toHaveAccessibleName('Mara');
    await expect(burnDown.biggestItem(1).title).toHaveText('Rent a 7-seat van');
    await expect(burnDown.biggestItem(1).owner).toHaveAccessibleName('Walt');
    await expect(burnDown.biggestItem(2).title).toHaveText('Grocery list for three dinners');
  });

  // L2-071 AC3, AC6
  test('says "All done" and when, with nothing left open', async ({ page }) => {
    await thePlanBurnedDown(page);
    await page.goto(burnDownUrl);
    const burnDown = new BurnDownPage(page);

    await expect(burnDown.headline).toHaveText('All done');
    await expect(burnDown.badge).toHaveCount(0);
    await expect(burnDown.forecast).toHaveText('Finished Sep 17 · 9 days early');
    await expect(burnDown.legendKeys).toHaveText(['Points left', 'Ideal line']);
    await expect(burnDown.biggestItems).toHaveCount(0);
    await expect(burnDown.biggestEmpty).toHaveText('Nothing left open. Nice work, all six of you.');
  });

  // L2-071 AC8
  test('says there is nothing to burn down yet, and offers "New story"', async ({ page }) => {
    await thePlanEmpty(page);
    await page.goto(burnDownUrl);
    const burnDown = new BurnDownPage(page);

    await expect(burnDown.empty).toContainText(
      'Add a story or two and the chart draws itself as they get done.',
    );
    await burnDown.newStory.click();

    await expect(new NewStoryDialog(page).heading).toBeVisible();
  });

  // L2-056, L2-077 AC2
  test('says it could not be loaded, and tries again', async ({ page, hub }) => {
    await thePlanFailing(page);
    await page.goto(burnDownUrl);
    const burnDown = new BurnDownPage(page);
    const plan = planOf(page);

    await expect(burnDown.error).toContainText('It’s safe. Check your connection and try again.');
    // The hub's connection reads it again; let that read fail too before the plan recovers.
    await hub.connected();
    await expect.poll(() => plan.burnReads).toBeGreaterThanOrEqual(2);
    plan.recover();
    await burnDown.tryAgain.click();
    await expect(burnDown.headline).toHaveText('24 pts left');
  });

  // L2-077 AC2
  test('says Plan is switched off, with the way back to the Popkin', async ({ page }) => {
    await thePlanOff(page);
    await page.goto(burnDownUrl);
    const burnDown = new BurnDownPage(page);

    await expect(burnDown.off).toBeVisible();
    await expect(burnDown.backToPopkin).toHaveText('Back to Cabin Week ’27');
  });

  // L2-068 AC12
  test('reads itself again when the plan changes', async ({ page, hub }) => {
    const plan = await maraWithAPlan(page);
    await page.goto(burnDownUrl);
    const burnDown = new BurnDownPage(page);
    await expect(burnDown.headline).toHaveText('24 pts left');
    await hub.connected();
    await expect.poll(() => plan.burnReads).toBeGreaterThanOrEqual(2);

    plan.burn = {
      ...plan.burn,
      pointsLeft: 16,
      behind: -1,
      days: [...plan.burn.days.slice(0, -1), 16],
    };
    await hub.push('PlanChanged', popkinId, 2);

    await expect(burnDown.headline).toHaveText('16 pts left');
    await expect(burnDown.badge).toHaveText('1 ahead');
  });

  // L2-071 AC7
  test('sets "Biggest open" beside the chart from 1024 px', async ({ page }) => {
    await maraWithAPlan(page);
    await page.goto(burnDownUrl);
    const burnDown = new BurnDownPage(page);

    const chart = (await burnDown.chart.boundingBox())!;
    const biggest = (await burnDown.biggest.boundingBox())!;
    expect(biggest.x).toBeGreaterThanOrEqual(chart.x + chart.width);
    expect(biggest.y).toBeLessThan(chart.y + chart.height);
  });
});

test.describe('the burn-down on a phone', () => {
  test.use({ viewport: { width: 360, height: 780 } });

  // L2-071 AC7
  test('sets "Biggest open" under the chart', async ({ page }) => {
    await maraWithAPlan(page);
    await page.goto(burnDownUrl);
    const burnDown = new BurnDownPage(page);
    await expect(burnDown.biggestItems).toHaveCount(3);

    const chart = (await burnDown.chart.boundingBox())!;
    const biggest = (await burnDown.biggest.boundingBox())!;
    expect(biggest.y).toBeGreaterThanOrEqual(chart.y + chart.height);
  });
});
