// Acceptance Test
// Traces to: L2-070 AC4
// Description: the person who added a story, its owner or the Host deletes it from the Story
// dialog after confirming in "Delete this story?"; anyone else sees no "Delete". The confirm is
// busy while it deletes, and a failure keeps the story and says so.
import { maraWithAPlan, openStory, planOf, planUrl, thePlanAsSam } from '../fixtures/plan';
import { expect, test } from '../fixtures/pk-test';
import { DeleteStoryDialog } from '../pages/delete-story.dialog';
import { PlanBoardPage } from '../pages/plan-board.page';

test.describe('deleting a story', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  // L2-070 AC4
  test('asks first, then deletes the story and the board drops its card', async ({ page }) => {
    const plan = await maraWithAPlan(page);
    await page.goto(planUrl);
    const story = await openStory(page, 'Rent a 7-seat van');
    const release = plan.holdWrites();

    await story.delete.click();
    const confirm = new DeleteStoryDialog(page);
    await expect(confirm.heading).toHaveText('Delete this story?');
    await expect(confirm.description).toHaveText('This can’t be undone.');
    await expect(confirm.keep).toBeFocused();
    await confirm.delete.click();

    await expect(confirm.delete).toHaveText('Deleting…');
    await expect(confirm.delete).toBeDisabled();
    release();
    await expect(confirm.root).toHaveCount(0);
    await expect(story.root).toHaveCount(0);
    expect(plan.deletes).toEqual(['Rent a 7-seat van']);
    const board = new PlanBoardPage(page);
    await expect(board.card('Rent a 7-seat van').root).toHaveCount(0);
    await expect(board.card('Grocery list for three dinners').root).toBeVisible();
  });

  // L2-070 AC4
  test('"Keep it" goes back to the story and deletes nothing', async ({ page }) => {
    const plan = await maraWithAPlan(page);
    await page.goto(planUrl);
    const story = await openStory(page, 'Rent a 7-seat van');

    await story.delete.click();
    const confirm = new DeleteStoryDialog(page);
    await confirm.keep.click();

    await expect(confirm.root).toHaveCount(0);
    await expect(story.heading).toBeVisible();
    expect(plan.deletes).toHaveLength(0);
  });

  // L2-070 AC4
  test('keeps the story when deleting fails and says so', async ({ page }) => {
    await maraWithAPlan(page);
    await page.goto(planUrl);
    const story = await openStory(page, 'Rent a 7-seat van');
    planOf(page).failWrites();

    await story.delete.click();
    const confirm = new DeleteStoryDialog(page);
    await confirm.delete.click();

    await expect(confirm.failed).toContainText('We couldn’t delete the story.');
    await expect(confirm.failed).toContainText('It’s still on the board. Try again.');
    await expect(confirm.delete).toBeEnabled();
  });

  // L2-070 AC4
  test('shows no "Delete" to someone who did not add it, does not own it and is not the Host', async ({
    page,
  }) => {
    await thePlanAsSam(page);
    await page.goto(planUrl);

    const story = await openStory(page, 'Rent a 7-seat van');

    await expect(story.save).toBeVisible();
    await expect(story.delete).toHaveCount(0);
  });

  // L2-056 AC8
  test('cannot be closed while it deletes: Escape, Close and Keep it wait for the answer', async ({
    page,
  }) => {
    const plan = await maraWithAPlan(page);
    await page.goto(planUrl);
    const story = await openStory(page, 'Rent a 7-seat van');
    const release = plan.holdWrites();
    await story.delete.click();
    const confirm = new DeleteStoryDialog(page);

    await confirm.delete.click();
    await expect(confirm.delete).toHaveText('Deleting…');
    await page.keyboard.press('Escape');
    await confirm.close.click();

    await expect(confirm.root).toHaveCount(1);
    await expect(confirm.keep).toBeDisabled();
    release();
    await expect(confirm.root).toHaveCount(0);
    expect(plan.deletes).toEqual(['Rent a 7-seat van']);
  });
});
