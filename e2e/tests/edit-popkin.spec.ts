import { homeNow, homeUrl } from '../fixtures/home';
import { expect, test } from '../fixtures/pk-test';
import { maraWithSettings } from '../fixtures/settings';
import { EditPopkinDialog } from '../pages/edit-popkin.dialog';
import { PopkinHomePage } from '../pages/popkin-home.page';
import { PopkinSettingsDialog } from '../pages/popkin-settings.dialog';

/** The Host opens "Edit name and look" from Popkin settings on the home. */
async function openEdit(page: import('@playwright/test').Page): Promise<EditPopkinDialog> {
  await new PopkinHomePage(page).settings.click();
  await new PopkinSettingsDialog(page).editLook.click();
  const edit = new EditPopkinDialog(page);
  await expect(edit.heading).toBeVisible();
  return edit;
}

// L2-020 AC1, AC3, AC6 and L2-008: the Host changes the Popkin's name, emoji and colour.
test.describe('Edit name and look', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install({ time: homeNow });
  });

  test('opens from the Host’s Popkin settings with the Popkin as it is', async ({ page }) => {
    await maraWithSettings(page);
    await page.goto(homeUrl);

    const edit = await openEdit(page);

    await expect(edit.description).toHaveText('Everyone sees the change straight away.');
    await expect(edit.name).toHaveValue('Lakeside Weekend');
    await expect(edit.emojiNamed('Camping')).toHaveAttribute('aria-pressed', 'true');
    await expect(edit.colourNamed('Teal')).toHaveAttribute('aria-pressed', 'true');
    await expect(edit.save).toHaveText('Save');
  });

  test('saves a new name, emoji and colour, and the home shows them at once', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    const settings = await maraWithSettings(page);
    await page.goto(homeUrl);
    const home = new PopkinHomePage(page);
    const edit = await openEdit(page);

    await edit.name.fill('Campfire Nights');
    await edit.emojiNamed('Party popper').click();
    await edit.colourNamed('Plum').click();
    await edit.save.click();

    await expect(edit.root).toHaveCount(0);
    expect(settings.sent.look).toEqual([{ name: 'Campfire Nights', emoji: '🎉', colour: 'Plum' }]);
    await expect(home.heading).toHaveText('Campfire Nights');
    await expect(home.tile).toHaveText('🎉');
    await expect(home.screen).toHaveAttribute('data-accent', 'plum');
    await expect(home.sidebarName).toHaveText('Campfire Nights');
    await expect(home.sidebarTile).toHaveText('🎉');
  });

  test('reads “Saving…” and cannot be sent twice while it saves', async ({ page }) => {
    const settings = await maraWithSettings(page);
    const release = settings.hold('look');
    await page.goto(homeUrl);
    const edit = await openEdit(page);

    await edit.save.click();

    await expect(edit.save).toHaveText('Saving…');
    await expect(edit.save).toBeDisabled();
    release();
    await expect(edit.root).toHaveCount(0);
    expect(settings.sent.look).toHaveLength(1);
  });

  test('asks for a name and sends nothing without one', async ({ page }) => {
    const settings = await maraWithSettings(page);
    await page.goto(homeUrl);
    const edit = await openEdit(page);

    await edit.name.fill('');

    await expect(edit.nameError).toHaveText('Give your Popkin a name.');
    await expect(edit.name).toHaveAttribute('aria-invalid', 'true');
    await expect(edit.save).toBeDisabled();
    expect(settings.sent.look).toEqual([]);
  });

  test('keeps what was entered when the save fails, and saves on a second try', async ({
    page,
  }) => {
    const settings = await maraWithSettings(page);
    settings.fail('look');
    await page.goto(homeUrl);
    const home = new PopkinHomePage(page);
    const edit = await openEdit(page);
    await edit.name.fill('Campfire Nights');
    await edit.colourNamed('Plum').click();

    await edit.save.click();

    await expect(edit.alert).toContainText('We couldn’t save that.');
    await expect(edit.alert).toContainText('Your changes are still here. Try again.');
    await expect(edit.name).toHaveValue('Campfire Nights');
    await expect(edit.colourNamed('Plum')).toHaveAttribute('aria-pressed', 'true');

    settings.recover('look');
    await edit.save.click();

    await expect(edit.root).toHaveCount(0);
    await expect(home.heading).toHaveText('Campfire Nights');
  });

  test('changes nothing on Cancel and gives the focus back to Popkin settings', async ({
    page,
  }) => {
    const settings = await maraWithSettings(page);
    await page.goto(homeUrl);
    const home = new PopkinHomePage(page);
    const edit = await openEdit(page);
    await edit.name.fill('Campfire Nights');

    await edit.cancel.click();

    await expect(edit.root).toHaveCount(0);
    expect(settings.sent.look).toEqual([]);
    await expect(home.heading).toHaveText('Lakeside Weekend');
    await expect(home.settings).toBeFocused();
  });
});
