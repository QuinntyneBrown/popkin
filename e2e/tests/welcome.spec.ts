import { asVisitor } from '../fixtures/journeys';
import { expect, test } from '../fixtures/pk-test';
import { WelcomePage } from '../pages/welcome.page';

// L2-002, L2-007 AC3
test.describe('The welcome screen', () => {
  test.beforeEach(async ({ page }) => {
    await asVisitor(page);
  });

  test('is open to a visitor and says what Popkin is', async ({ page, pk }) => {
    await pk.open('welcome');
    const welcome = new WelcomePage(page);

    await expect(welcome.root).toBeVisible();
    await expect(welcome.heading).toHaveText('Your people, popped up in seconds.');
    await expect(welcome.lead).toHaveText(
      'A little home for your group. Chat, photos, plans and calls, all in one place.',
    );
  });

  test('"Start a Popkin" opens the sign-up screen', async ({ page, pk }) => {
    await pk.open('welcome');

    await new WelcomePage(page).start.click();

    await expect(page).toHaveURL('/sign-up');
  });

  test('"Join with a code" leads to its address', async ({ page, pk }) => {
    await pk.open('welcome');

    await expect(new WelcomePage(page).joinWithCode).toHaveAttribute('href', '/join');
  });

  test('"Already have an account? Sign in" opens the sign-in screen', async ({ page, pk }) => {
    await pk.open('welcome');

    await new WelcomePage(page).signIn.click();

    await expect(page).toHaveURL('/sign-in');
  });

  // L2-058
  test('is a split screen from 768 px, with its two actions side by side from 1280 px', async ({
    page,
    pk,
  }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await pk.open('welcome');
    const welcome = new WelcomePage(page);
    await expect(welcome.start).toBeVisible();
    await expect(welcome.aside).toBeHidden();

    await page.setViewportSize({ width: 768, height: 900 });
    await expect(welcome.aside).toBeVisible();
    expect(await welcome.actionsSideBySide()).toBe(false);

    await page.setViewportSize({ width: 1280, height: 900 });
    await expect.poll(() => welcome.actionsSideBySide()).toBe(true);
  });
});
