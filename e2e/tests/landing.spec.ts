import { asVisitor } from '../fixtures/journeys';
import { maraWithPopkins } from '../fixtures/my-popkins';
import { expect, test } from '../fixtures/pk-test';
import { MyPopkinsPage } from '../pages/my-popkins.page';

// L2-002
test.describe('The landing page address', () => {
  // AC3
  test('opens My Popkins for a person who is signed in', async ({ page }) => {
    await maraWithPopkins(page);

    await page.goto('/');

    await expect(page).toHaveURL('/popkins');
    await expect(new MyPopkinsPage(page).root).toBeVisible();
  });

  test('stays where it is for a visitor', async ({ page }) => {
    await asVisitor(page);

    await page.goto('/');

    await expect(page).toHaveURL('/');
  });
});
