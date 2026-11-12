import { expect, test } from '../fixtures/pk-test';
import { NotFoundPage } from '../pages/not-found.page';

// L2-056 AC5: an address that matches no screen offers a way to My Popkins or the landing page.
test.describe('an address that matches no screen', () => {
  test('shows the not-found screen with a way to My Popkins and the landing page', async ({
    page,
    pk,
  }) => {
    await pk.open('notFound');

    const notFound = new NotFoundPage(page);
    await expect(notFound.root).toBeVisible();
    await expect(notFound.heading).toHaveText('This page popped off somewhere');
    await expect(notFound.myPopkins).toHaveAttribute('href', '/popkins');
    await expect(notFound.landing).toHaveAttribute('href', '/');
  });

  // L2-057 AC8: one h1, a main landmark and a link that skips to the main content.
  test('skips to the main content from the keyboard', async ({ page, pk }) => {
    await pk.open('notFound');

    const notFound = new NotFoundPage(page);
    await expect(notFound.heading).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(notFound.skipLink).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(notFound.main).toBeFocused();
    await expect(page).toHaveURL(/\/no-such-screen$/);
  });
});
