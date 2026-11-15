// Acceptance Test
// Traces to: L2-070 AC1, AC3, AC8
// Description: in the Story dialog a member changes the title, column, points, owner, tag or due
// date and chooses "Save"; the rules of a new story apply, "Save" is busy while it saves, the
// card shows the change, and a failure keeps the changes.
import { maraWithAPlan, openStory, planOf, planUrl } from '../fixtures/plan';
import { expect, test } from '../fixtures/pk-test';
import { PlanBoardPage } from '../pages/plan-board.page';

test.describe('saving a story', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  // L2-070 AC3, AC8
  test('saves every change and the card shows it', async ({ page }) => {
    const plan = await maraWithAPlan(page);
    await page.goto(planUrl);
    const dialog = await openStory(page, 'Rent a 7-seat van');
    const release = plan.holdWrites();

    await dialog.title.fill('Rent a 9-seat van');
    await dialog.points(8).click();
    await dialog.member('Walt').click();
    await dialog.member('Sam').click();
    await dialog.tag('Money').click();
    await dialog.due.fill('2026-09-24');
    await dialog.save.click();

    await expect(dialog.save).toHaveText('Saving…');
    await expect(dialog.save).toBeDisabled();
    release();
    await expect(dialog.root).toHaveCount(0);
    expect(plan.saves).toEqual([
      {
        title: 'Rent a 9-seat van',
        column: 'ToDo',
        points: 8,
        ownerMembershipId: plan.members[4].membershipId,
        tag: 'Money',
        dueDate: '2026-09-24',
      },
    ]);
    const card = new PlanBoardPage(page).card('Rent a 9-seat van');
    await expect(card.points).toHaveAccessibleName('8 points');
    await expect(card.owner).toHaveAccessibleName('Sam');
    await expect(card.tag).toHaveText('Money');
    await expect(card.due).toHaveText('Due Sep 24');
  });

  // L2-070 AC8
  test('clears the due date', async ({ page }) => {
    const plan = await maraWithAPlan(page);
    await page.goto(planUrl);
    const dialog = await openStory(page, 'Rent a 7-seat van');

    await dialog.due.fill('');
    await dialog.save.click();

    await expect(dialog.root).toHaveCount(0);
    expect(plan.saves[0]['dueDate']).toBeNull();
    await expect(new PlanBoardPage(page).card('Rent a 7-seat van').due).toHaveCount(0);
  });

  // L2-070 AC3, L2-069 AC4
  test('saves nothing without a title and says what to fix', async ({ page }) => {
    const plan = await maraWithAPlan(page);
    await page.goto(planUrl);
    const dialog = await openStory(page, 'Rent a 7-seat van');

    await dialog.title.fill(' ');
    await dialog.save.click();

    await expect(dialog.title).toHaveAttribute('aria-invalid', 'true');
    await expect(dialog.root.locator('.field__error')).toHaveText('Say what needs doing.');
    expect(plan.saves).toHaveLength(0);
  });

  // L2-070 AC3
  test('keeps the changes when saving fails', async ({ page }) => {
    await maraWithAPlan(page);
    await page.goto(planUrl);
    const dialog = await openStory(page, 'Rent a 7-seat van');
    planOf(page).failWrites();

    await dialog.title.fill('Rent a 9-seat van');
    await dialog.save.click();

    await expect(dialog.failed).toContainText('Your changes are still here. Try again.');
    await expect(dialog.title).toHaveValue('Rent a 9-seat van');
    await expect(dialog.save).toBeEnabled();
  });
});
