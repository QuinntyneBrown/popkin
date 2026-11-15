// Acceptance Test
// Traces to: L2-075 AC4, AC3
// Description: the recap of a Popkin with Plan on counts the stories done out of the stories
// made; with no story, or with Plan off, it says nothing of the plan.
import { expect, test } from '../fixtures/pk-test';
import { recapUrl, theMockRecap } from '../fixtures/wrap-up';
import { RecapPage } from '../pages/recap.page';

test.describe('the plan in the recap', () => {
  // L2-075 AC4
  test('counts the stories done out of the stories made', async ({ page }) => {
    await theMockRecap(page, (wrapUp) => (wrapUp.recap.stories = { done: 12, made: 14 }));
    await page.goto(recapUrl);
    const recap = new RecapPage(page);

    await expect(recap.plan).toContainText('The plan');
    await expect(recap.plan).toContainText('12 of 14 stories done');
  });

  // L2-075 AC3, AC4
  test('says nothing of the plan without a story or while Plan is off', async ({ page }) => {
    await theMockRecap(page);
    await page.goto(recapUrl);
    const recap = new RecapPage(page);

    await expect(recap.heading).toBeVisible();
    await expect(recap.plan).toHaveCount(0);
  });
});
