// Acceptance Test
// Traces to: L2-069 AC1 to AC7, L2-068 AC8, AC9
// Description: any member adds a story with "New story": what needs doing, where it goes, how
// big it is, who is on it and its tag; the title is checked, the action says where the story
// goes and is busy while it saves, a failure keeps everything entered, and the dialog is a sheet
// on a phone and a panel beside the board from 768 px. The starters open it with their title.
import { maraWithAPlan, planUrl, thePlanEmpty } from '../fixtures/plan';
import { expect, test } from '../fixtures/pk-test';
import { NewStoryDialog } from '../pages/new-story.dialog';
import { PlanBoardPage } from '../pages/plan-board.page';

test.describe('New story', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  // L2-069 AC1, AC3
  test('asks what needs doing, where it goes, how big it is, who is on it and its tag', async ({
    page,
  }) => {
    await maraWithAPlan(page);
    await page.goto(planUrl);
    await new PlanBoardPage(page).newStory.click();
    const dialog = new NewStoryDialog(page);

    await expect(dialog.heading).toBeVisible();
    await expect(dialog.title).toBeFocused();
    await expect(dialog.where.getByRole('radio')).toHaveText(['Backlog', 'This sprint']);
    await expect(dialog.whereTo('This sprint')).toHaveAttribute('aria-checked', 'true');
    await expect(dialog.size.getByRole('radio')).toHaveText(['1', '2', '3', '5', '8']);
    await expect(dialog.points(2)).toHaveAttribute('aria-checked', 'true');
    await expect(dialog.sizeHint).toBeVisible();
    const who = dialog.who.getByRole('button');
    await expect(who).toHaveCount(6);
    for (const [i, name] of ['Mara', 'Walt', 'Dev', 'Ellie', 'Sam', 'Priya'].entries()) {
      await expect(who.nth(i)).toHaveAccessibleName(name);
    }
    await expect(dialog.tags.getByRole('radio')).toHaveText([
      'Travel',
      'Stay',
      'Food',
      'Money',
      'Fun',
    ]);
    await expect(dialog.tag('Travel')).toHaveAttribute('aria-checked', 'true');
    await expect(dialog.action).toHaveText('Add to To do');

    await dialog.whereTo('Backlog').click();

    await expect(dialog.action).toHaveText('Add to backlog');
  });

  // L2-069 AC2
  test('says no one is on it until a member is chosen, and choosing them again clears it', async ({
    page,
  }) => {
    await maraWithAPlan(page);
    await page.goto(planUrl);
    await new PlanBoardPage(page).newStory.click();
    const dialog = new NewStoryDialog(page);

    await expect(dialog.whoHint).toBeVisible();
    await dialog.member('Walt').click();
    await expect(dialog.member('Walt')).toHaveAttribute('aria-pressed', 'true');
    await expect(dialog.whoHint).toBeHidden();
    await dialog.member('Walt').click();
    await expect(dialog.member('Walt')).toHaveAttribute('aria-pressed', 'false');
    await expect(dialog.whoHint).toBeVisible();
  });

  // L2-069 AC4
  test('saves nothing without a title and says what to fix', async ({ page }) => {
    const plan = await maraWithAPlan(page);
    await page.goto(planUrl);
    await new PlanBoardPage(page).newStory.click();
    const dialog = new NewStoryDialog(page);

    await dialog.title.fill('   ');
    await dialog.action.click();

    await expect(dialog.title).toHaveAttribute('aria-invalid', 'true');
    await expect(dialog.titleError).toHaveText('Say what needs doing.');
    await expect(dialog.title).toHaveAttribute('maxlength', '80');
    expect(plan.added).toHaveLength(0);
  });

  // L2-069 AC5
  test('adds the story last in its column, busy while it saves', async ({ page }) => {
    const plan = await maraWithAPlan(page);
    await page.goto(planUrl);
    const board = new PlanBoardPage(page);
    await board.newStory.click();
    const dialog = new NewStoryDialog(page);
    const release = plan.holdWrites();

    await dialog.title.fill('Who brings what: packing list');
    await dialog.points(3).click();
    await dialog.member('Ellie').click();
    await dialog.tag('Food').click();
    await dialog.action.click();

    await expect(dialog.action).toHaveText('Adding…');
    await expect(dialog.action).toBeDisabled();
    release();
    await expect(dialog.root).toHaveCount(0);
    expect(plan.added).toEqual([
      {
        title: 'Who brings what: packing list',
        column: 'ToDo',
        points: 3,
        ownerMembershipId: plan.members[3].membershipId,
        tag: 'Food',
      },
    ]);
    const toDo = board.column('To do');
    await expect(toDo.titles.last()).toHaveText('Who brings what: packing list');
    await expect(toDo.count).toHaveText('stories: 5');
    await expect(toDo.points).toHaveText('14 pts');
  });

  // L2-069 AC6
  test('keeps everything entered when saving fails', async ({ page }) => {
    const plan = await maraWithAPlan(page);
    await page.goto(planUrl);
    await new PlanBoardPage(page).newStory.click();
    const dialog = new NewStoryDialog(page);
    plan.failWrites();

    await dialog.title.fill('Who brings what: packing list');
    await dialog.whereTo('Backlog').click();
    await dialog.action.click();

    await expect(dialog.failed).toContainText('Your story is still here. Try again.');
    await expect(dialog.title).toHaveValue('Who brings what: packing list');
    await expect(dialog.whereTo('Backlog')).toHaveAttribute('aria-checked', 'true');
    await expect(dialog.action).toHaveText('Add to backlog');
    await expect(dialog.action).toBeEnabled();
  });

  // L2-069 AC7, L2-068 AC8
  test('is a panel beside the board from 768 px, opened from the header', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 900 });
    await maraWithAPlan(page);
    await page.goto(planUrl);
    const board = new PlanBoardPage(page);

    await expect(board.newStoryFab).toBeHidden();
    await board.newStory.click();

    const panel = await new NewStoryDialog(page).panel.boundingBox();
    expect(panel?.x).toBeGreaterThan(300);
    expect(Math.round((panel?.x ?? 0) + (panel?.width ?? 0))).toBe(768);
  });

  // L2-069 AC7, L2-068 AC8
  test('is a sheet at the bottom on a phone, opened from the floating action', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await maraWithAPlan(page);
    await page.goto(planUrl);
    const board = new PlanBoardPage(page);

    await expect(board.newStory).toBeHidden();
    await board.newStoryFab.click();

    const dialog = new NewStoryDialog(page);
    // Once it has slid up, it sits on the bottom edge, the full width of the screen.
    await expect(async () => {
      const panel = await dialog.panel.boundingBox();
      expect(panel?.x).toBe(0);
      expect(panel?.width).toBe(360);
      expect(Math.round((panel?.y ?? 0) + (panel?.height ?? 0))).toBe(800);
    }).toPass();
  });

  // L2-068 AC9
  test('opens from a starter with its title filled in', async ({ page }) => {
    await thePlanEmpty(page);
    await page.goto(planUrl);

    await new PlanBoardPage(page).starter('Find somewhere to stay').click();

    const dialog = new NewStoryDialog(page);
    await expect(dialog.title).toHaveValue('Find somewhere to stay');
  });
});
