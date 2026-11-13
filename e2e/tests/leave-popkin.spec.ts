import { homeUrl } from '../fixtures/home';
import { aMemberAtHome, openLeave } from '../fixtures/leaving';
import { popkinsUrl } from '../fixtures/my-popkins';
import { expect, test } from '../fixtures/pk-test';
import { MyPopkinsPage } from '../pages/my-popkins.page';
import { NotFoundPage } from '../pages/not-found.page';
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

  // L2-047 AC2, L2-058 AC7: My Popkins opens without it, one column on a phone, three on a desktop.
  for (const width of [360, 1280]) {
    test(`opens My Popkins without the Popkin once the member has left, at ${width} px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      const leaving = await aMemberAtHome(page);
      await page.goto(homeUrl);
      const dialog = await openLeave(page);

      await dialog.leave.click();

      const popkins = new MyPopkinsPage(page);
      await expect(page).toHaveURL(popkinsUrl);
      await expect(popkins.root).toBeVisible();
      await expect(popkins.cardNames).toHaveText(['Thursday Night Group', 'Tigers U9 Parents']);
      await expect(popkins.cardNames.filter({ hasText: 'Lakeside Weekend' })).toHaveCount(0);
      expect(leaving.sent).toBe(1);
    });
  }

  // L2-056 AC3
  test('reads "Leaving…" and is sent once while it goes through', async ({ page }) => {
    const leaving = await aMemberAtHome(page);
    const release = leaving.hold();
    await page.goto(homeUrl);
    const dialog = await openLeave(page);

    await dialog.leave.click();

    await expect(dialog.leave).toHaveText('Leaving…');
    await expect(dialog.leave).toBeDisabled();
    await expect(dialog.leave).toHaveAttribute('aria-busy', 'true');
    await dialog.leave.click({ force: true });
    release();
    await expect(page).toHaveURL(popkinsUrl);
    expect(leaving.sent).toBe(1);
  });

  test('says so and keeps the member in the Popkin when leaving fails', async ({ page }) => {
    const leaving = await aMemberAtHome(page);
    leaving.answer = 'fails';
    await page.goto(homeUrl);
    const dialog = await openLeave(page);

    await dialog.leave.click();

    await expect(dialog.failed).toContainText('We couldn’t take you out.');
    await expect(dialog.failed).toContainText('You’re still in Lakeside Weekend. Try again.');
    await expect(dialog.leave).toBeEnabled();
    await expect(dialog.leave).toHaveText('Leave');
    await expect(page).toHaveURL(homeUrl);
  });

  // L2-047 AC4: after leaving, the Popkin is not there for them, as for a stranger.
  test('finds the Popkin is not there once the member has left and goes back to it', async ({
    page,
  }) => {
    await aMemberAtHome(page);
    await page.goto(homeUrl);
    const dialog = await openLeave(page);
    await dialog.leave.click();
    await expect(page).toHaveURL(popkinsUrl);

    await page.goBack();

    await expect(new NotFoundPage(page).root).toBeVisible();
  });
});
