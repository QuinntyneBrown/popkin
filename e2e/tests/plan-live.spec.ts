// Acceptance Test
// Traces to: L2-068 AC12
// Description: the plan board follows what other members change without a reload: the hub's
// PlanChanged with a version above the one the board holds, and a connection that comes back,
// each read the board again; a version it already holds, or another Popkin's, does not.
import { popkinId } from '../fixtures/chat';
import type { Hub } from '../fixtures/hub';
import { expect, test } from '../fixtures/pk-test';
import { type Plan, maraWithAPlan, planUrl, story } from '../fixtures/plan';
import { PlanBoardPage } from '../pages/plan-board.page';

/**
 * An open board reads itself again once the hub has connected (the shared real-time rules); a
 * change made only after that read proves the event, not the first read, brought it.
 */
async function caughtUp(plan: Plan, hub: Hub): Promise<void> {
  await hub.connected();
  await expect.poll(() => plan.reads).toBeGreaterThanOrEqual(2);
}

test.describe('a plan board that changes while it is open', () => {
  test.use({ viewport: { width: 1280, height: 900 } });
  let plan: Plan;
  let board: PlanBoardPage;

  test.beforeEach(async ({ page, hub }) => {
    plan = await maraWithAPlan(page);
    await page.goto(planUrl);
    board = new PlanBoardPage(page);
    await expect(board.card('Rent a 7-seat van').root).toBeVisible();
    await caughtUp(plan, hub);
  });

  // L2-068 AC12
  test('shows a story another member added and one they moved to Done', async ({ hub }) => {
    plan.stories.push(story('Pack the first-aid kit', 'ToDo', 1, 'Stay'));
    plan.stories = plan.stories.map((s) =>
      s.title === 'Rent a 7-seat van' ? { ...s, column: 'Done' } : s,
    );
    plan.version = 2;

    await hub.push('PlanChanged', popkinId, 2);

    await expect(board.column('To do').titles).toContainText(['Pack the first-aid kit']);
    await expect(board.column('Done').titles).toContainText(['Rent a 7-seat van']);
  });

  // L2-068 AC12
  test('drops a change it already holds, and one of another Popkin', async ({ hub }) => {
    const reads = plan.reads;

    await hub.push('PlanChanged', '00000000-0000-4000-8000-000000000999', 9);
    await hub.push('PlanChanged', popkinId, 1);
    plan.version = 2;
    await hub.push('PlanChanged', popkinId, 2);

    await expect.poll(() => plan.reads).toBe(reads + 1);
  });

  // L2-068 AC12, the shared real-time rules
  test('reads the board again when the connection comes back', async ({ hub }) => {
    plan.stories = plan.stories.filter((s) => s.title !== 'Rent a 7-seat van');

    await hub.drop();
    await hub.connected();

    await expect(board.card('Rent a 7-seat van').root).toHaveCount(0);
  });
});
