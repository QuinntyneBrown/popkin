// Acceptance Test
// Traces to: L2-070 AC7, L2-069 AC8
// Description: the plan of a wrapped-up Popkin is read-only: every story is readable, the header
// says it wrapped up, no card opens the Story dialog and "New story" is not shown.
import { expect, test } from '../fixtures/pk-test';
import { planUrl, thePlanWrappedUp } from '../fixtures/plan';
import { PlanBoardPage } from '../pages/plan-board.page';

test.describe('the plan of a wrapped-up Popkin', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  // L2-070 AC7
  test('shows every story, says it wrapped up and offers no way to change it', async ({ page }) => {
    await thePlanWrappedUp(page);
    await page.goto(planUrl);
    const board = new PlanBoardPage(page);

    await expect(board.cards).toHaveCount(14);
    await expect(board.wrappedUp).toHaveText(
      'This Popkin has wrapped up. The plan stays, but nobody can change it.',
    );
    await expect(board.sub).toHaveText('Planning sprint · Aug 30 – Sep 26 · Wrapped up');
    await expect(board.newStory).toHaveCount(0);
    await expect(board.newStoryFab).toHaveCount(0);
    await expect(board.board.getByRole('button')).toHaveCount(0);
  });

  // L2-070 AC7
  test('opens no story when a card is clicked', async ({ page }) => {
    await thePlanWrappedUp(page);
    await page.goto(planUrl);
    const board = new PlanBoardPage(page);

    await board.card('Rent a 7-seat van').root.click();

    await expect(page.getByRole('dialog')).toHaveCount(0);
  });
});

test.describe('the plan of a wrapped-up Popkin on a phone', () => {
  test.use({ viewport: { width: 360, height: 780 } });

  // L2-070 AC7
  test('offers no floating "New story"', async ({ page }) => {
    await thePlanWrappedUp(page);
    await page.goto(planUrl);
    const board = new PlanBoardPage(page);

    await expect(board.cards.first()).toBeVisible();
    await expect(board.newStoryFab).toHaveCount(0);
  });
});
