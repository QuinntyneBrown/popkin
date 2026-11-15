// Acceptance Test
// Traces to: L2-070 AC1, AC2
// Description: choosing a story's card opens the Story dialog, titled with the story, with its
// column, points, owner, tag and due date; "Move to {next column}" and "Mark done" move it at
// once and close the dialog. A story that is done is neither moved on nor marked done.
import { maraWithAPlan, planOf, planUrl } from '../fixtures/plan';
import { expect, test } from '../fixtures/pk-test';
import { PlanBoardPage } from '../pages/plan-board.page';
import { StoryDialog } from '../pages/story.dialog';

test.describe('moving a story', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  // L2-070 AC1
  test('opens the story with its column, points, owner, tag and due date', async ({ page }) => {
    await maraWithAPlan(page);
    await page.goto(planUrl);

    await new PlanBoardPage(page).card('Book the cabin at Pine Hollow').root.click();

    const dialog = new StoryDialog(page, 'Book the cabin at Pine Hollow');
    await expect(dialog.heading).toHaveText('Book the cabin at Pine Hollow');
    await expect(dialog.line).toHaveText('Doing · 8 points · Mara · Stay');
    await expect(dialog.title).toHaveValue('Book the cabin at Pine Hollow');
    await expect(dialog.whereTo('Doing')).toHaveAttribute('aria-checked', 'true');
    await expect(dialog.points(8)).toHaveAttribute('aria-checked', 'true');
    await expect(dialog.member('Mara')).toHaveAttribute('aria-pressed', 'true');
    await expect(dialog.tag('Stay')).toHaveAttribute('aria-checked', 'true');
    await expect(dialog.due).toHaveValue('2026-09-18');
    // A story in Doing is marked done; it has no "Move to".
    await expect(dialog.markDone).toBeVisible();
    await expect(dialog.moveOn).toHaveCount(0);
  });

  // L2-070 AC1, AC2
  test('moves a story in To do to Doing at once and closes', async ({ page }) => {
    const plan = await maraWithAPlan(page);
    await page.goto(planUrl);
    const board = new PlanBoardPage(page);

    await board.card('Rent a 7-seat van').root.click();
    const dialog = new StoryDialog(page, 'Rent a 7-seat van');
    await expect(dialog.moveOn).toHaveText('Move to Doing');
    await dialog.moveOn.click();

    await expect(dialog.root).toHaveCount(0);
    await expect(board.column('Doing').titles.last()).toHaveText('Rent a 7-seat van');
    await expect(board.column('To do').count).toHaveText('stories: 3');
    expect(plan.moves).toEqual([{ title: 'Rent a 7-seat van', column: 'Doing' }]);
  });

  // L2-070 AC1, AC2
  test('marks a story done at once and closes', async ({ page }) => {
    const plan = await maraWithAPlan(page);
    await page.goto(planUrl);
    const board = new PlanBoardPage(page);

    await board.card('Kayak rental for two days').root.click();
    const dialog = new StoryDialog(page, 'Kayak rental for two days');
    await expect(dialog.moveOn).toHaveText('Move to To do');
    await dialog.markDone.click();

    await expect(dialog.root).toHaveCount(0);
    await expect(board.column('Done').titles.last()).toHaveText('Kayak rental for two days');
    expect(plan.moves).toEqual([{ title: 'Kayak rental for two days', column: 'Done' }]);
  });

  // L2-070 AC1
  test('offers a story that is done neither "Move to" nor "Mark done"', async ({ page }) => {
    await maraWithAPlan(page);
    await page.goto(planUrl);

    await new PlanBoardPage(page).card('Collect $150 deposits').root.click();

    const dialog = new StoryDialog(page, 'Collect $150 deposits');
    await expect(dialog.line).toHaveText('Done · 5 points · Priya · Money');
    await expect(dialog.moveOn).toHaveCount(0);
    await expect(dialog.markDone).toHaveCount(0);
  });

  // L2-070 AC2
  test('stays open and says so when the move fails', async ({ page }) => {
    await maraWithAPlan(page);
    await page.goto(planUrl);
    planOf(page).failWrites();

    await new PlanBoardPage(page).card('Rent a 7-seat van').root.click();
    const dialog = new StoryDialog(page, 'Rent a 7-seat van');
    await dialog.moveOn.click();

    await expect(dialog.failed).toContainText('We couldn’t save that.');
    await expect(dialog.heading).toBeVisible();
    await dialog.close.click();
    await expect(new PlanBoardPage(page).column('To do').titles.first()).toHaveText(
      'Rent a 7-seat van',
    );
  });
});
