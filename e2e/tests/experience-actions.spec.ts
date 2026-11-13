import { people } from '../fixtures/chat';
import {
  canoeId,
  experienceUrl,
  experiencesOf,
  experiencesUrl,
  ridgeId,
  theMockExperienceScreens,
} from '../fixtures/experiences';
import { expect, test } from '../fixtures/pk-test';
import { DeleteExperienceDialog } from '../pages/delete-experience.dialog';
import { ExperienceActionsDialog } from '../pages/experience-actions.dialog';
import { ExperienceDetailPage } from '../pages/experience-detail.page';
import { ExperiencesPage } from '../pages/experiences.page';
import { ShareExperienceDialog } from '../pages/share-experience.dialog';
import { Toasts } from '../pages/toasts';

const canoe = experienceUrl(canoeId);

// L2-040 AC6
test.describe('The actions of an experience', () => {
  test('offers its sharer to edit or delete it', async ({ page }) => {
    await theMockExperienceScreens(page);
    await page.goto(canoe);
    const detail = new ExperienceDetailPage(page);

    await detail.actions.click();

    const actions = new ExperienceActionsDialog(page);
    await expect(actions.heading).toHaveText('Sunrise canoe to Heron Point');
    await expect(actions.items).toHaveText(['Edit', 'Delete']);
    await page.keyboard.press('Escape');
    await expect(actions.root).toHaveCount(0);
    await expect(detail.actions).toBeFocused();
  });

  test('offers the Host only to delete someone else’s', async ({ page }) => {
    await theMockExperienceScreens(page);
    await page.goto(experienceUrl(ridgeId));
    const detail = new ExperienceDetailPage(page);

    await detail.actions.click();

    await expect(new ExperienceActionsDialog(page).items).toHaveText(['Delete']);
  });

  test('offers nothing to a member who neither shared it nor is the Host', async ({ page }) => {
    await theMockExperienceScreens(page, (all) => {
      all.viewer = people.dev;
      all.host = false;
    });
    await page.goto(canoe);
    const detail = new ExperienceDetailPage(page);

    await expect(detail.title).toBeVisible();
    await expect(detail.actions).toHaveCount(0);
  });

  test('opens the experience to edit, with what it has, and saves the changes', async ({
    page,
  }) => {
    await theMockExperienceScreens(page);
    await page.goto(canoe);
    const detail = new ExperienceDetailPage(page);
    await detail.actions.click();

    await new ExperienceActionsDialog(page).edit.click();

    const dialog = new ShareExperienceDialog(page);
    await expect(dialog.heading).toHaveText('Edit experience');
    await expect(dialog.title).toHaveValue('Sunrise canoe to Heron Point');
    await expect(dialog.kind('Something we did')).toBeChecked();
    await expect(dialog.when).toHaveValue('Sat morning');
    await expect(dialog.place).toHaveValue('Heron Point, Lake Ossia');
    await expect(dialog.picture).toBeVisible();
    await expect(dialog.action).toHaveText('Save changes');

    await dialog.title.fill('Sunrise canoe, twice round the point');
    await dialog.place.fill('');
    await dialog.action.click();

    await expect(dialog.root).toHaveCount(0);
    await expect(detail.title).toHaveText('Sunrise canoe, twice round the point');
    await expect(detail.place).toHaveCount(0);
    await expect(detail.picture.locator('img')).toBeVisible();
    expect(experiencesOf(page).sent).toEqual([
      {
        title: 'Sunrise canoe, twice round the point',
        kind: 'Did',
        when: 'Sat morning',
        place: '',
        picture: null,
        removePicture: false,
      },
    ]);
  });

  test('takes the picture away when it is removed in the edit', async ({ page }) => {
    await theMockExperienceScreens(page);
    await page.goto(canoe);
    const detail = new ExperienceDetailPage(page);
    await detail.actions.click();
    await new ExperienceActionsDialog(page).edit.click();
    const dialog = new ShareExperienceDialog(page);

    await dialog.removePicture.click();
    await dialog.action.click();

    await expect(dialog.root).toHaveCount(0);
    await expect(detail.picture).toHaveText(/🏕️/);
    expect(experiencesOf(page).sent[0].removePicture).toBe(true);
  });

  test('keeps the edit open and says so when it does not save', async ({ page }) => {
    await theMockExperienceScreens(page, (all) => all.break('edit'));
    await page.goto(canoe);
    await new ExperienceDetailPage(page).actions.click();
    await new ExperienceActionsDialog(page).edit.click();
    const dialog = new ShareExperienceDialog(page);
    await dialog.title.fill('Sunrise canoe, twice');

    await dialog.action.click();

    await expect(dialog.failed).toContainText('We couldn’t save that.');
    await expect(dialog.title).toHaveValue('Sunrise canoe, twice');
  });

  test('asks before deleting, and keeps the experience on "Keep it"', async ({ page }) => {
    await theMockExperienceScreens(page);
    await page.goto(canoe);
    const detail = new ExperienceDetailPage(page);
    await detail.actions.click();

    await new ExperienceActionsDialog(page).delete.click();

    const confirm = new DeleteExperienceDialog(page);
    await expect(confirm.heading).toHaveText('Delete this experience?');
    await expect(confirm.description).toHaveText(
      'Its ratings and comments go with it. This can’t be undone.',
    );
    await expect(confirm.keep).toBeFocused();
    await confirm.keep.click();
    await expect(confirm.root).toHaveCount(0);
    await expect(detail.title).toBeVisible();
    expect(experiencesOf(page).deleted).toEqual([]);
  });

  test('deletes the experience, goes back to the list and confirms it', async ({ page }) => {
    await theMockExperienceScreens(page);
    await page.goto(canoe);
    await new ExperienceDetailPage(page).actions.click();
    await new ExperienceActionsDialog(page).delete.click();

    await new DeleteExperienceDialog(page).delete.click();

    await expect(page).toHaveURL(experiencesUrl);
    const experiences = new ExperiencesPage(page);
    await expect(experiences.titles).toHaveText([
      'La Paloma Taqueria',
      'Ridge trail loop',
      'Beach day next summer?',
    ]);
    await expect(new Toasts(page).toast).toContainText('Experience deleted');
    expect(experiencesOf(page).deleted).toEqual([canoeId]);
  });

  // L2-056 AC3
  test('reads "Deleting…" while it is sent, and says so when it does not go through', async ({
    page,
  }) => {
    await theMockExperienceScreens(page, (all) => all.break('delete'));
    const release = experiencesOf(page).holdChange('delete');
    await page.goto(canoe);
    const detail = new ExperienceDetailPage(page);
    await detail.actions.click();
    await new ExperienceActionsDialog(page).delete.click();
    const confirm = new DeleteExperienceDialog(page);

    await confirm.delete.click();

    await expect(confirm.delete).toHaveText('Deleting…');
    await expect(confirm.delete).toBeDisabled();
    release();
    await expect(confirm.failed).toContainText('We couldn’t delete that.');
    await expect(confirm.delete).toHaveText('Delete');
    await expect(confirm.delete).toBeEnabled();
  });
});
