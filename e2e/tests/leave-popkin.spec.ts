import { homeUrl } from '../fixtures/home';
import { aMemberAtHome, openLeave } from '../fixtures/leaving';
import { expect, test } from '../fixtures/pk-test';
import { PopkinHomePage } from '../pages/popkin-home.page';

// Journey 18, Leave a Popkin: L2-047.
test.describe('Leave a Popkin', () => {
  // L2-047 AC1.
  test('names the Popkin, says what stays and how to come back, and offers Leave and Stay', async ({
    page,
  }) => {
    await aMemberAtHome(page);
    await page.goto(homeUrl);

    const dialog = await openLeave(page);

    await expect(dialog.heading).toHaveText('Leave Lakeside Weekend?');
    await expect(dialog.root).toHaveAccessibleDescription(
      'Your messages and photos stay. To come back you’ll need a new invite.',
    );
    await expect(dialog.leave).toHaveText('Leave');
    await expect(dialog.stay).toHaveText('Stay');
    await expect(dialog.stay).toBeFocused();
  });

  test('stays in the Popkin on "Stay" and gives the focus back to Popkin settings', async ({
    page,
  }) => {
    const leaving = await aMemberAtHome(page);
    await page.goto(homeUrl);
    const dialog = await openLeave(page);

    await dialog.stay.click();

    await expect(dialog.root).toHaveCount(0);
    await expect(page).toHaveURL(homeUrl);
    await expect(new PopkinHomePage(page).settings).toBeFocused();
    expect(leaving.sent).toBe(0);
  });

  test('stays in the Popkin on Escape, by the keyboard', async ({ page }) => {
    const leaving = await aMemberAtHome(page);
    await page.goto(homeUrl);
    const dialog = await openLeave(page);

    await page.keyboard.press('Escape');

    await expect(dialog.root).toHaveCount(0);
    await expect(new PopkinHomePage(page).settings).toBeFocused();
    expect(leaving.sent).toBe(0);
  });
});
