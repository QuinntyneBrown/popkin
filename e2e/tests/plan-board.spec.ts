// Acceptance Test
// Traces to: L2-068 AC2 to AC11
// Description: the plan board shows the sprint, the four columns with their counts and points,
// and each story's card; a Popkin with no stories offers the four starters; the board loads with
// a skeleton and recovers from a failure.
import { maraWithAPlan, planUrl } from '../fixtures/plan';
import { expect, test } from '../fixtures/pk-test';
import { BurnDownPage } from '../pages/burn-down.page';
import { PlanBoardPage } from '../pages/plan-board.page';

test.describe('the plan board', () => {
  // L2-068 AC2
  test('names the plan and the sprint, with the days left, and its two views', async ({ page }) => {
    await maraWithAPlan(page);
    await page.goto(planUrl);
    const board = new PlanBoardPage(page);

    await expect(board.heading).toBeVisible();
    await expect(board.sub).toHaveText('Planning sprint · Aug 30 – Sep 26 · 14 days left');
    await expect(board.views).toHaveText(['Board', 'Burn-down']);
    await expect(board.currentView).toHaveText('Board');
  });

  // L2-068 AC7
  test('shows the sprint chip, the points left and how far behind, and opens the burn-down', async ({
    page,
  }) => {
    await maraWithAPlan(page);
    await page.goto(planUrl);
    const board = new PlanBoardPage(page);

    await expect(board.sprintChip).toHaveAccessibleName('24 pts left · 7 behind');
    await board.sprintChip.click();

    await expect(new BurnDownPage(page).root).toBeAttached();
  });

  // L2-068 AC3, AC5
  test('shows the four columns in order with their stories and points', async ({ page }) => {
    await maraWithAPlan(page);
    await page.goto(planUrl);
    const board = new PlanBoardPage(page);

    await expect(board.columnHeadings).toHaveText(['Backlog', 'To do', 'Doing', 'Done']);
    await expect(board.column('Backlog').count).toHaveText('stories: 3');
    await expect(board.column('Backlog').points).toHaveText('6 pts');
    await expect(board.column('Backlog').hint).toHaveText('Ideas, not this sprint');
    await expect(board.column('To do').points).toHaveText('11 pts');
    await expect(board.column('Doing').points).toHaveText('13 pts');
    await expect(board.column('Done').count).toHaveText('stories: 4');
    await expect(board.column('To do').titles).toHaveText([
      'Rent a 7-seat van',
      'Grocery list for three dinners',
      'Shared sheet to split costs',
      'Check fishing licence rules',
    ]);
  });

  // L2-068 AC4, AC5
  test('shows each story’s tag, points, owner and due date', async ({ page }) => {
    await maraWithAPlan(page);
    await page.goto(planUrl);
    const board = new PlanBoardPage(page);

    const cabin = board.card('Book the cabin at Pine Hollow');
    await expect(cabin.tag).toHaveText('Stay');
    await expect(cabin.points).toHaveAccessibleName('8 points');
    await expect(cabin.owner).toHaveAccessibleName('Mara');
    await expect(cabin.due).toHaveText('Due Sep 18');
    await expect(board.card('Kayak rental for two days').owner).toHaveAccessibleName('No one yet');
    await expect(board.card('Start the Popkin').points).toHaveAccessibleName('1 point');
    // A story that is done shows no due date, and no card shows a count of comments yet.
    await expect(board.column('Done').root.getByText(/^Due /)).toHaveCount(0);
    await expect(board.root.getByText(/comment/i)).toHaveCount(0);
  });

  // L2-068 AC6
  test('reads "Nothing here yet" in a column with no stories', async ({ page }) => {
    await maraWithAPlan(page, (plan) => {
      plan.stories = plan.stories.filter((story) => story.column !== 'Doing');
    });
    await page.goto(planUrl);
    const board = new PlanBoardPage(page);

    await expect(board.column('Doing').empty).toHaveText('Nothing here yet');
    await expect(board.column('Doing').count).toHaveText('stories: 0');
  });

  // L2-068 AC7, AC9
  test('with no stories, explains what a story is and offers the four starters', async ({
    page,
  }) => {
    await maraWithAPlan(page, (plan) => {
      plan.stories = [];
      plan.sprint = null;
      plan.progress = null;
    });
    await page.goto(planUrl);
    const board = new PlanBoardPage(page);

    await expect(board.empty).toBeVisible();
    await expect(board.emptyText).toHaveText(
      'A story is one job someone can own. Start with the big four and split them up as you go.',
    );
    await expect(board.starters).toHaveText([
      'Pick the dates',
      'Find somewhere to stay',
      'Sort out getting there',
      'Set a budget',
    ]);
    await expect(board.columnHeadings).toHaveCount(0);
    // L2-068 AC7: a sprint with no stories has no chip.
    await expect(board.sprintChip).toHaveCount(0);
  });

  // L2-068 AC10
  test('tells assistive technology it is loading until it answers', async ({ page }) => {
    const plan = await maraWithAPlan(page);
    const release = plan.hold();
    await page.goto(planUrl);
    const board = new PlanBoardPage(page);

    await expect(board.loading).toBeAttached();
    release();
    await expect(board.loading).toHaveCount(0);
    await expect(board.columnHeadings).toHaveCount(4);
  });

  // L2-068 AC11
  test('says the plan could not be loaded, keeps the tabs, and tries again', async ({
    page,
    hub,
  }) => {
    const plan = await maraWithAPlan(page);
    plan.fail();
    await page.goto(planUrl);
    const board = new PlanBoardPage(page);

    await expect(board.error).toBeVisible();
    await expect(board.nav).toBeVisible();
    // The board reads itself again once the hub connects (L2-068 AC12); that read fails too, so
    // only "Try again" brings it back.
    await hub.connected();
    await expect.poll(() => plan.reads).toBeGreaterThanOrEqual(2);
    await expect(board.error).toBeVisible();
    plan.recover();
    await board.tryAgain.click();

    await expect(board.columnHeadings).toHaveCount(4);
  });
});

test.describe('the plan board on a phone', () => {
  test.use({ viewport: { width: 360, height: 780 } });

  // L2-068 AC8: one column at a time, the rest a swipe away.
  test('shows one column at a time and scrolls sideways to the others', async ({ page }) => {
    await maraWithAPlan(page);
    await page.goto(planUrl);
    const board = new PlanBoardPage(page);

    await expect(board.column('Backlog').root).toBeInViewport({ ratio: 0.9 });
    await expect(board.column('Done').root).not.toBeInViewport();
    await board.column('Done').root.scrollIntoViewIfNeeded();
    await expect(board.column('Done').root).toBeInViewport({ ratio: 0.9 });
  });
});

test.describe('the plan board on a desktop', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  // L2-068 AC8: from 1024 px the four columns share the width.
  test('shows the four columns side by side', async ({ page }) => {
    await maraWithAPlan(page);
    await page.goto(planUrl);
    const board = new PlanBoardPage(page);

    for (const name of ['Backlog', 'To do', 'Doing', 'Done']) {
      await expect(board.column(name).root).toBeInViewport({ ratio: 0.5 });
    }
  });
});
