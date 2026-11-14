import { homeNow, homeUrl } from '../fixtures/home';
import { expect, test } from '../fixtures/pk-test';
import { maraWithSettings } from '../fixtures/settings';
import { openChangeLength } from '../fixtures/settings-states';
import { EndDateDialog } from '../pages/end-date.dialog';
import { PopkinHomePage } from '../pages/popkin-home.page';

// L2-020 AC4, AC6 and L2-009: the Host changes how long the Popkin lasts.
test.describe('Change how long it lasts', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install({ time: homeNow });
  });

  test('opens with the four lengths and the Popkin’s own chosen', async ({ page }) => {
    await maraWithSettings(page);
    await page.goto(homeUrl);

    const dialog = await openChangeLength(page);

    await expect(dialog.description).toHaveText('Everyone sees the new time left.');
    await expect(dialog.options).toHaveCount(4);
    await expect(dialog.checked).toContainText('The weekend');
    await expect(dialog.endDate).toHaveCount(0);
  });

  test('keeps it going: no end, and no time left on the home', async ({ page }) => {
    const settings = await maraWithSettings(page);
    await page.goto(homeUrl);
    const home = new PopkinHomePage(page);
    const dialog = await openChangeLength(page);

    await dialog.option('Keep it going').click();
    await dialog.save.click();

    await expect(dialog.root).toHaveCount(0);
    expect(settings.sent.length).toEqual([{ length: 'KeepItGoing', endsAt: null }]);
    await expect(home.timeLeft).toHaveCount(0);
  });

  test('wraps it up at midnight for just today', async ({ page }) => {
    const settings = await maraWithSettings(page);
    await page.goto(homeUrl);
    const dialog = await openChangeLength(page);

    await dialog.option('Just today').click();
    await dialog.save.click();

    await expect(dialog.root).toHaveCount(0);
    expect(settings.sent.length).toEqual([
      { length: 'JustToday', endsAt: new Date(2026, 8, 13, 0, 0).toISOString() },
    ]);
  });

  test('wraps it up at the date picked, and the home shows the new time left', async ({ page }) => {
    const settings = await maraWithSettings(page);
    await page.goto(homeUrl);
    const home = new PopkinHomePage(page);
    const dialog = await openChangeLength(page);

    await dialog.option('Until a date').click();
    await expect(dialog.endDate).toHaveText('Ends Sun, 13 Sep · 6:00 pm');
    await dialog.endDate.click();
    const end = new EndDateDialog(page);
    await end.day.fill('2026-09-14');
    await end.time.fill('18:00');
    await end.setTheEnd.click();
    await expect(dialog.endDate).toHaveText('Ends Mon, 14 Sep · 6:00 pm');
    await dialog.save.click();

    await expect(dialog.root).toHaveCount(0);
    expect(settings.sent.length).toEqual([
      { length: 'UntilDate', endsAt: new Date(2026, 8, 14, 18, 0).toISOString() },
    ]);
    await expect(home.timeLeft).toHaveText('2 days 6 hrs left · Wraps up Mon, 6 pm');
  });

  test('reads “Saving…” and cannot be sent twice while it saves', async ({ page }) => {
    const settings = await maraWithSettings(page);
    const release = settings.hold('length');
    await page.goto(homeUrl);
    const dialog = await openChangeLength(page);

    await dialog.save.click();

    await expect(dialog.save).toHaveText('Saving…');
    await expect(dialog.save).toBeDisabled();
    release();
    await expect(dialog.root).toHaveCount(0);
    expect(settings.sent.length).toHaveLength(1);
  });

  test('says when it still wraps up if the change fails, and keeps the choice', async ({
    page,
  }) => {
    const settings = await maraWithSettings(page);
    settings.fail('length');
    await page.goto(homeUrl);
    const dialog = await openChangeLength(page);
    await dialog.option('Keep it going').click();

    await dialog.save.click();

    await expect(dialog.alert).toContainText('We couldn’t change that.');
    await expect(dialog.alert).toContainText('It still wraps up Sunday at 6 pm. Try again.');
    await expect(dialog.checked).toContainText('Keep it going');
  });

  test('changes nothing on Cancel and gives the focus back to Popkin settings', async ({
    page,
  }) => {
    const settings = await maraWithSettings(page);
    await page.goto(homeUrl);
    const home = new PopkinHomePage(page);
    const dialog = await openChangeLength(page);
    await dialog.option('Keep it going').click();

    await dialog.cancel.click();

    await expect(dialog.root).toHaveCount(0);
    expect(settings.sent.length).toEqual([]);
    await expect(home.timeLeft).toBeVisible();
    await expect(home.settings).toBeFocused();
  });
});
