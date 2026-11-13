import { experiencesOf, experiencesUrl, theMockExperienceScreens } from '../fixtures/experiences';
import { aFileOf, aPhoto } from '../fixtures/photos';
import { expect, test } from '../fixtures/pk-test';
import { ExperiencesPage } from '../pages/experiences.page';
import { ShareExperienceDialog } from '../pages/share-experience.dialog';
import { Toasts } from '../pages/toasts';

async function openTheDialog(page: import('@playwright/test').Page) {
  await page.goto(experiencesUrl);
  const experiences = new ExperiencesPage(page);
  await experiences.shareOne.click();
  return { experiences, dialog: new ShareExperienceDialog(page) };
}

test.describe('Sharing an experience', () => {
  // L2-040 AC1
  test('asks for a title and a kind, and optionally when, a place and a picture', async ({
    page,
  }) => {
    await theMockExperienceScreens(page);
    const { dialog } = await openTheDialog(page);

    await expect(dialog.heading).toBeVisible();
    await expect(dialog.title).toBeFocused();
    await expect(dialog.title).toHaveAttribute('maxlength', '80');
    await expect(dialog.kinds.getByRole('radio')).toHaveText([
      'Something we did',
      'Restaurant',
      'Want to do',
    ]);
    await expect(dialog.kind('Something we did')).toBeChecked();
    await expect(dialog.when).toBeVisible();
    await expect(dialog.place).toHaveAttribute('maxlength', '80');
    await expect(dialog.addPicture).toContainText('Add a picture');
    await expect(dialog.action).toHaveText('Share it');
  });

  // L2-040 AC1, L2-058 AC9
  test('opens from "Share one" in the header on a wide screen, and from an empty list', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1024, height: 800 });
    await theMockExperienceScreens(page, (all) => all.empty());
    await page.goto(experiencesUrl);
    const experiences = new ExperiencesPage(page);
    const dialog = new ShareExperienceDialog(page);

    await experiences.shareFirst.click();
    await expect(dialog.heading).toBeVisible();
    await dialog.close.click();
    await expect(dialog.root).toHaveCount(0);
    await expect(experiences.shareFirst).toBeFocused();
  });

  // L2-040 AC2
  test('saves nothing without a title, marks the field and says what to fix', async ({ page }) => {
    await theMockExperienceScreens(page);
    const { dialog } = await openTheDialog(page);

    await dialog.action.click();

    await expect(dialog.summary).toContainText('One thing to fix');
    await expect(dialog.summary).toContainText('Title: give it a name.');
    await expect(dialog.titleError).toHaveText('Give it a name.');
    await expect(dialog.title).toHaveAttribute('aria-invalid', 'true');
    expect(experiencesOf(page).sent).toEqual([]);
  });

  // L2-040 AC3
  test('refuses a picture outside the limits of a photo', async ({ page }) => {
    await theMockExperienceScreens(page);
    const { dialog } = await openTheDialog(page);
    await dialog.title.fill('Bonfire songs on the beach');

    await dialog.choose(aFileOf(11));
    await dialog.action.click();

    await expect(dialog.pictureError).toHaveText('That photo is over 10 MB. Choose a smaller one.');
    expect(experiencesOf(page).sent).toEqual([]);
  });

  // L2-040 AC2, AC3: the API has the last word
  test('marks the field the API refuses', async ({ page }) => {
    await theMockExperienceScreens(page, (all) =>
      all.break('share', { status: 400, code: 'place_too_long', field: 'place' }),
    );
    const { dialog } = await openTheDialog(page);
    await dialog.title.fill('Bonfire songs on the beach');

    await dialog.action.click();

    await expect(dialog.placeError).toHaveText('Keep the place to 80 characters.');
    await expect(dialog.action).toBeEnabled();
  });

  // L2-040 AC4
  test('closes, puts the experience first in the list and confirms it', async ({ page }) => {
    await theMockExperienceScreens(page);
    const { experiences, dialog } = await openTheDialog(page);

    await dialog.title.fill('Bonfire songs on the beach');
    await dialog.when.fill('Sat night');
    await dialog.place.fill('The cove');
    await dialog.choose(aPhoto('bonfire.jpg'));
    await expect(dialog.picture).toBeVisible();
    await dialog.action.click();

    await expect(dialog.root).toHaveCount(0);
    await expect(experiences.titles).toHaveCount(5);
    await expect(experiences.titles.first()).toHaveText('Bonfire songs on the beach');
    await expect(experiences.byOf('Bonfire songs')).toHaveText(/Mara · Sat night/);
    const toasts = new Toasts(page);
    await expect(toasts.toast).toContainText('Experience shared');
    await expect(toasts.toast).toContainText('Bonfire songs on the beach is first in the list.');
    expect(experiencesOf(page).sent).toEqual([
      {
        title: 'Bonfire songs on the beach',
        kind: 'Did',
        when: 'Sat night',
        place: 'The cove',
        picture: 'bonfire.jpg',
        removePicture: false,
      },
    ]);
  });

  // L2-040 AC4, AC5
  test('shows "All" when what was shared is outside the filter, with the Popkin’s emoji for no picture', async ({
    page,
  }) => {
    await theMockExperienceScreens(page);
    await page.goto(`${experiencesUrl}?filter=did`);
    const experiences = new ExperiencesPage(page);
    await experiences.shareOne.click();
    const dialog = new ShareExperienceDialog(page);

    await dialog.title.fill('Kayaks next year');
    await dialog.kind('Want to do').click();
    await dialog.action.click();

    await expect(experiences.all).toHaveAttribute('aria-pressed', 'true');
    await expect(experiences.titles.first()).toHaveText('Kayaks next year');
    await expect(experiences.mediaOf('Kayaks next year')).toHaveText(/🏕️/);
    await expect(experiences.byOf('Kayaks next year')).toHaveText(/Mara · Idea/);
  });

  test('takes the picture away again with "Remove picture"', async ({ page }) => {
    await theMockExperienceScreens(page);
    const { dialog } = await openTheDialog(page);
    await dialog.title.fill('Bonfire songs on the beach');
    await dialog.choose(aPhoto('bonfire.jpg'));

    await dialog.removePicture.click();
    await dialog.action.click();

    await expect(dialog.root).toHaveCount(0);
    expect(experiencesOf(page).sent[0].picture).toBeNull();
  });

  // L2-056 AC3
  test('reads "Sharing…" and cannot be sent twice while it saves', async ({ page }) => {
    await theMockExperienceScreens(page);
    const release = experiencesOf(page).holdChange('share');
    const { dialog } = await openTheDialog(page);
    await dialog.title.fill('Bonfire songs on the beach');

    await dialog.action.click();

    await expect(dialog.action).toHaveText('Sharing…');
    await expect(dialog.action).toBeDisabled();
    await expect(dialog.title).toHaveAttribute('readonly', '');
    release();
    await expect(dialog.root).toHaveCount(0);
    expect(experiencesOf(page).sent).toHaveLength(1);
  });

  // L2-040 AC4
  test('keeps everything entered and says so when it does not save', async ({ page }) => {
    await theMockExperienceScreens(page, (all) => all.break('share'));
    const { experiences, dialog } = await openTheDialog(page);
    await dialog.title.fill('Bonfire songs on the beach');
    await dialog.kind('Restaurant').click();

    await dialog.action.click();

    await expect(dialog.failed).toContainText('We couldn’t share that.');
    await expect(dialog.failed).toContainText('Everything you entered is still here.');
    await expect(dialog.title).toHaveValue('Bonfire songs on the beach');
    await expect(dialog.kind('Restaurant')).toBeChecked();
    experiencesOf(page).mend('share');
    await dialog.action.click();
    await expect(experiences.kindOf('Bonfire songs')).toHaveText('Restaurant');
  });

  // The toast's "Undo" takes back what was just shared.
  test('takes the experience back with "Undo"', async ({ page }) => {
    await theMockExperienceScreens(page);
    const { experiences, dialog } = await openTheDialog(page);
    await dialog.title.fill('Bonfire songs on the beach');
    await dialog.action.click();
    await expect(experiences.titles).toHaveCount(5);

    await new Toasts(page).action('Undo').click();

    await expect(experiences.titles).toHaveCount(4);
    expect(experiencesOf(page).deleted).toHaveLength(1);
  });

  // L2-052 AC2
  test('shows markup in a title as text', async ({ page }) => {
    await theMockExperienceScreens(page);
    const { experiences, dialog } = await openTheDialog(page);

    await dialog.title.fill('<b>Bonfire</b>');
    await dialog.action.click();

    await expect(experiences.titles.first()).toHaveText('<b>Bonfire</b>');
  });
});
