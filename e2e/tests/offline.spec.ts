import { expect, test } from '../fixtures/pk-test';
import { OfflinePage } from '../pages/offline.page';

test.describe('the offline screen', () => {
  // L2-056 AC4
  test('says the screen needs a connection the first time it opens', async ({ page, pk }) => {
    await pk.open('offline');
    const offline = new OfflinePage(page);

    await expect(offline.root).toBeVisible();
    await expect(offline.heading).toHaveText('You’re offline');
    await expect(offline.text).toHaveText(
      'This screen needs a connection the first time it opens. Popkins you’ve opened before still show what they had.',
    );
    await expect(offline.myPopkins).toHaveAttribute('href', '/popkins');
    await expect(offline.logo).toHaveAttribute('href', '/popkins');
  });

  test('Try again while still offline stays, and moves to the heading', async ({ page, pk }) => {
    await pk.open('offline');
    const offline = new OfflinePage(page);
    await expect(offline.root).toBeVisible();
    await offline.connection(false);

    await offline.tryAgain.click();

    await expect(offline.root).toBeVisible();
    await expect(offline.heading).toBeFocused();
  });

  test('Try again with the connection back opens the screen', async ({ page, pk }) => {
    await pk.open('offline');
    const offline = new OfflinePage(page);
    await expect(offline.root).toBeVisible();
    await offline.connection(false);
    await offline.tryAgain.click();
    await offline.connection(true);

    await offline.tryAgain.click();

    await expect(page).toHaveURL(/\/popkins$/);
  });

  test('Try again works from the keyboard', async ({ page, pk }) => {
    await pk.open('offline');
    const offline = new OfflinePage(page);

    await offline.tryAgain.focus();
    await page.keyboard.press('Enter');

    await expect(page).toHaveURL(/\/popkins$/);
  });
});
